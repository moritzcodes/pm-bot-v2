'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProductTerm {
  id: string;
  term: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export function ProductTermsManager() {
  const [terms, setTerms] = useState<ProductTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newTerm, setNewTerm] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch existing terms
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/product-terms');
        
        if (!response.ok) {
          throw new Error('Failed to fetch product terms');
        }
        
        const data = await response.json();
        setTerms(data);
      } catch (err) {
        console.error('Error fetching product terms:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTerms();
  }, []);
  
  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTerm.trim()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/product-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          term: newTerm.trim(),
          description: newDescription.trim() || null,
          category: newCategory.trim() || null,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add product term');
      }
      
      const newTermData = await response.json();
      setTerms((prev) => [...prev, newTermData]);
      
      // Reset form
      setNewTerm('');
      setNewDescription('');
      setNewCategory('');
    } catch (err) {
      console.error('Error adding product term:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteTerm = async (id: string) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/product-terms/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete product term');
      }
      
      setTerms((prev) => prev.filter((term) => term.id !== id));
    } catch (err) {
      console.error('Error deleting product term:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Add New Term</h2>
        <form onSubmit={handleAddTerm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="term">Product/Term Name *</Label>
              <Input
                id="term"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Enter product name or terminology"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g., Hardware, Software, Service"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Brief description of the product or term"
              rows={3}
            />
          </div>
          
          <Button type="submit" disabled={isSubmitting || !newTerm.trim()}>
            {isSubmitting ? 'Adding...' : 'Add Term'}
          </Button>
        </form>
        
        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}
      </Card>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Existing Terms</h2>
        
        {isLoading ? (
          <p className="text-muted-foreground">Loading terms...</p>
        ) : terms.length === 0 ? (
          <p className="text-muted-foreground">No product terms added yet.</p>
        ) : (
          <div className="space-y-4">
            {terms.map((term) => (
              <div key={term.id} className="p-4 border rounded-md flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{term.term}</h3>
                  {term.category && (
                    <span className="text-xs px-2 py-1 bg-muted rounded-full">
                      {term.category}
                    </span>
                  )}
                  {term.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {term.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTerm(term.id)}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
} 