import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ASSISTANT_ID, OPENAI_API_KEY } from './config';
import { db } from './db';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * Helper function to update the enrichedData field without overwriting
 */
async function updateEnrichedData<T extends { enrichedData?: any }>(
  model: T, 
  id: string, 
  newData: Record<string, any>
) {
  let enrichedData = {};
  
  // If model has enrichedData, use it as base
  if (model.enrichedData) {
    if (typeof model.enrichedData === 'string') {
      try {
        enrichedData = JSON.parse(model.enrichedData);
      } catch (e) {
        // If it's not valid JSON, start fresh
        enrichedData = {};
      }
    } else {
      enrichedData = model.enrichedData;
    }
  }

  // Merge with new data
  enrichedData = {
    ...enrichedData,
    ...newData
  };

  return enrichedData;
}

/**
 * Helper function to add a file to the assistant
 * @param fileId The ID of the file to add
 */
async function addFileToAssistant(fileId: string) {
  try {
    if (!ASSISTANT_ID) {
      throw new Error('ASSISTANT_ID is not defined');
    }
    
    // First get the current file IDs
    const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
    
    // Create a list of all file IDs including the new one
    const fileIds = [...((assistant as any).file_ids || []), fileId];
    
    // Update the assistant with all file IDs
    await openai.beta.assistants.update(
      ASSISTANT_ID,
      {
        file_ids: fileIds
      } as any
    );
    
    return true;
  } catch (error) {
    console.error('Error attaching file to assistant:', error);
    return false;
  }
}

/**
 * Helper function to create a vector store and attach a file to it
 * @param fileId The ID of the file to add
 */
async function attachFileToVectorStore(fileId: string) {
  try {
    if (!ASSISTANT_ID) {
      throw new Error('ASSISTANT_ID is not defined');
    }
    
    // Create a vector store for the file
    const vectorStore = await openai.beta.vectorStores.create({
      name: `Vector store for file ${fileId}`,
      file_ids: [fileId]
    });
    
    // Get the current assistant to merge with existing tools
    const currentAssistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
    
    // Make sure we have the file_search tool
    const tools = currentAssistant.tools || [];
    if (!tools.some(tool => tool.type === "file_search")) {
      tools.push({ type: "file_search" });
    }
    
    // Update the assistant with the new vector store
    await openai.beta.assistants.update(
      ASSISTANT_ID as string,
      {
        tools: tools,
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStore.id]
          }
        }
      }
    );
    
    return vectorStore.id;
  } catch (error) {
    console.error('Error creating vector store and attaching to assistant:', error);
    return null;
  }
}

/**
 * Helper function to update the "enrichedData" field in the database
 */
export async function updateEnrichedDataDB(
  entity: 'transcription' | 'summary',
  id: string,
  enrichedData: Record<string, any>
) {
  try {
    switch (entity) {
      case 'transcription':
        await db.transcription.update({
          where: { id },
          data: { enrichedData },
        });
        break;
      case 'summary':
        await db.summary.update({
          where: { id },
          data: { enrichedData },
        });
        break;
      default:
        throw new Error(`Unknown entity: ${entity}`);
    }
  } catch (error) {
    console.error(`Error updating ${entity} ${id}:`, error);
    throw error;
  }
}

/**
 * Helper function for uploading a file to OpenAI
 */
async function uploadFileToOpenAI(filePath: string, fileType: string) {
  try {
    console.log(`Uploading ${fileType} to OpenAI...`);
    const file = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'assistants',
    });
    console.log(`${fileType} uploaded with ID: ${file.id}`);
    return file.id;
  } catch (error) {
    console.error(`Error uploading ${fileType} to OpenAI:`, error);
    throw error;
  }
}

/**
 * Add a transcription to the OpenAI Assistant's knowledge
 */
export async function addTranscriptionToAssistant(transcriptionId: string): Promise<{ fileId: string; vectorStoreId: string; success: boolean }> {
  if (!ASSISTANT_ID) {
    throw new Error('ASSISTANT_ID is not defined in environment variables');
  }

  try {
    // Get the transcription from the database
    const transcription = await db.transcription.findUnique({
      where: { id: transcriptionId },
    });

    if (!transcription) {
      throw new Error(`Transcription ${transcriptionId} not found`);
    }

    // Create a temporary file with the transcription content
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `transcription-${transcriptionId}.txt`);

    // Write the transcription content to the file
    fs.writeFileSync(tempFilePath, transcription.content);

    // Upload the file to OpenAI
    const fileId = await uploadFileToOpenAI(tempFilePath, 'transcription');

    // Attach the file to the assistant via vector store
    const vectorStoreId = await attachFileToVectorStore(fileId);
    if (!vectorStoreId) {
      throw new Error('Failed to attach file to vector store');
    }

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    // Update the enrichedData field in the database to include the file ID
    const enrichedData = (transcription.enrichedData || {}) as Record<string, any>;
    enrichedData.openaiFileId = fileId;
    enrichedData.vectorStoreId = vectorStoreId;
    await updateEnrichedDataDB('transcription', transcriptionId, enrichedData);

    return {
      success: true,
      fileId,
      vectorStoreId
    };
  } catch (error) {
    console.error('Error adding transcription to assistant:', error);
    throw error;
  }
}

/**
 * Add a summary to the OpenAI Assistant's knowledge
 */
export async function addSummaryToAssistant(summaryId: string): Promise<{ fileId: string; vectorStoreId: string; success: boolean }> {
  if (!ASSISTANT_ID) {
    throw new Error('ASSISTANT_ID is not defined in environment variables');
  }

  try {
    // Get the summary from the database
    const summary = await db.summary.findUnique({
      where: { id: summaryId },
    });

    if (!summary) {
      throw new Error(`Summary ${summaryId} not found`);
    }

    // Create a temporary file with the summary content
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `summary-${summaryId}.txt`);

    // Write the summary content to the file
    fs.writeFileSync(tempFilePath, summary.content);

    // Upload the file to OpenAI
    const fileId = await uploadFileToOpenAI(tempFilePath, 'summary');

    // Attach the file to the assistant via vector store
    const vectorStoreId = await attachFileToVectorStore(fileId);
    if (!vectorStoreId) {
      throw new Error('Failed to attach file to vector store');
    }

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    // Update the enrichedData field in the database to include the file ID
    const enrichedData = (summary.enrichedData || {}) as Record<string, any>;
    enrichedData.openaiFileId = fileId;
    enrichedData.vectorStoreId = vectorStoreId;
    await updateEnrichedDataDB('summary', summaryId, enrichedData);

    return {
      success: true,
      fileId,
      vectorStoreId
    };
  } catch (error) {
    console.error('Error adding summary to assistant:', error);
    throw error;
  }
}

/**
 * Upload a JSON file to the OpenAI Assistant via vector store
 * @param jsonData Object containing the JSON data to upload
 * @param fileName Optional name for the file
 */
export async function addJsonFileToAssistant(
  jsonData: Record<string, any>,
  fileName: string = 'data.json'
) {
  if (!ASSISTANT_ID) {
    throw new Error('ASSISTANT_ID is not defined in environment variables');
  }

  try {
    // Create a temporary file with the JSON content
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, fileName);

    // Write the JSON data to the file
    fs.writeFileSync(tempFilePath, JSON.stringify(jsonData, null, 2));

    // Upload the file to OpenAI
    const fileId = await uploadFileToOpenAI(tempFilePath, 'JSON file');

    // Attach the file to the assistant via vector store
    const vectorStoreId = await attachFileToVectorStore(fileId);
    if (!vectorStoreId) {
      throw new Error('Failed to attach file to vector store');
    }

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    return {
      fileId,
      vectorStoreId
    };
  } catch (error) {
    console.error('Error adding JSON file to assistant:', error);
    throw error;
  }
} 


