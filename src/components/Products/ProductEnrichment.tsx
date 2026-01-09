import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Plus } from 'lucide-react';
import supabase from '@/lib/supabase';
import { AppHeader } from '@/components/Navigation/AppHeader';
import { decodeHTMLEntities } from '@/lib/htmlUtils';

interface ProductData {
  model: string;
  product_type: string;
  brand?: string;
  description?: string;
  weight?: number;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
}

interface ProductEnrichmentProps {
  onSettingsClick: () => void;
}

export function ProductEnrichment({ onSettingsClick }: ProductEnrichmentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Live search effect with debouncing
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const timeoutId = setTimeout(async () => {
      try {
        const { data, error: searchError } = await supabase
          .from('products')
          .select('*')
          .ilike('model', `%${searchTerm.trim()}%`)
          .limit(20)
          .order('model');

        if (searchError) {
          setError(`Search error: ${searchError.message}`);
          setSearchResults([]);
        } else {
          setSearchResults(data || []);
        }
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelectProduct = (product: ProductData) => {
    setProductData(product);
    setEditMode(true);
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleCreateNew = () => {
    setProductData({
      model: searchTerm.trim(),
      product_type: '',
      brand: 'GE'
    });
    setEditMode(true);
    setSearchResults([]);
  };

  // Save product to database
  const handleSave = async () => {
    if (!productData || !productData.product_type) {
      setError('Product type is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: saveError } = await supabase
        .from('products')
        .upsert({
          model: productData.model,
          product_type: productData.product_type,
          brand: productData.brand || 'GE',
          description: productData.description || null,
          weight: productData.weight || null,
          dimensions: productData.dimensions || null
        }, {
          onConflict: 'model'
        });

      if (saveError) {
        setError(`Failed to save: ${saveError.message}`);
      } else {
        setError(null);
        alert('Product saved successfully!');
        setSearchTerm('');
        setProductData(null);
        setEditMode(false);
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Product Database" onSettingsClick={onSettingsClick} />
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <p className="text-muted-foreground">Look up or add appliance model information</p>

      {/* Search Form */}
      {!editMode && (
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-search">Search Model Number</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="model-search"
                type="text"
                placeholder="Start typing model number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoComplete="off"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && searchTerm.trim() && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Search Results */}
          {!loading && searchTerm.trim() && searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCreateNew}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((product) => (
                  <Card
                    key={product.model}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectProduct(product)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold">{product.model}</span>
                        <Badge variant="secondary">{product.product_type}</Badge>
                      </div>
                      {product.brand && (
                        <Badge variant="outline" className="text-xs">
                          {product.brand}
                        </Badge>
                      )}
                      {product.description && (
                        <p className="text-sm text-muted-foreground">
                          {decodeHTMLEntities(product.description)}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {product.weight && <span>Weight: {product.weight} lbs</span>}
                        {product.dimensions?.width && product.dimensions?.height && product.dimensions?.depth && (
                          <span>
                            {product.dimensions.width}" × {product.dimensions.height}" × {product.dimensions.depth}"
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && searchTerm.trim() && searchResults.length === 0 && (
            <div className="py-8 text-center space-y-4">
              <p className="text-muted-foreground">No products found matching "{searchTerm}"</p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Product
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Product Details Form */}
      {productData && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            {productData.brand ? `${productData.brand} ` : ''}
            {productData.model}
          </h3>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="product-type">Product Type *</Label>
              <Input
                id="product-type"
                type="text"
                placeholder="e.g., WASHER, REFRIGERATOR, DISHWASHER"
                value={productData.product_type}
                onChange={(e) =>
                  setProductData({ ...productData, product_type: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                type="text"
                placeholder="e.g., GE, Whirlpool, Samsung"
                value={productData.brand || ''}
                onChange={(e) =>
                  setProductData({ ...productData, brand: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                placeholder="e.g., Front Load Washer, 5.0 cu ft"
                value={productData.description || ''}
                onChange={(e) =>
                  setProductData({ ...productData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="200"
                  value={productData.weight || ''}
                  onChange={(e) =>
                    setProductData({
                      ...productData,
                      weight: e.target.value ? parseFloat(e.target.value) : undefined
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="width">Width (in)</Label>
                <Input
                  id="width"
                  type="number"
                  placeholder="27"
                  value={productData.dimensions?.width || ''}
                  onChange={(e) =>
                    setProductData({
                      ...productData,
                      dimensions: {
                        ...productData.dimensions,
                        width: e.target.value ? parseFloat(e.target.value) : undefined
                      }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (in)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="39"
                  value={productData.dimensions?.height || ''}
                  onChange={(e) =>
                    setProductData({
                      ...productData,
                      dimensions: {
                        ...productData.dimensions,
                        height: e.target.value ? parseFloat(e.target.value) : undefined
                      }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depth">Depth (in)</Label>
                <Input
                  id="depth"
                  type="number"
                  placeholder="32"
                  value={productData.dimensions?.depth || ''}
                  onChange={(e) =>
                    setProductData({
                      ...productData,
                      dimensions: {
                        ...productData.dimensions,
                        depth: e.target.value ? parseFloat(e.target.value) : undefined
                      }
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setProductData(null);
                setEditMode(false);
                setSearchTerm('');
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !productData.product_type}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Save Product
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Quick Add Common Models */}
      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-3">Common Product Types</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'WASHER',
            'DRYER',
            'REFRIGERATOR',
            'DISHWASHER',
            'RANGE',
            'OVEN',
            'MICROWAVE',
            'COOKTOP'
          ].map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => {
                if (productData) {
                  setProductData({ ...productData, product_type: type });
                }
              }}
            >
              {type}
            </Button>
          ))}
        </div>
      </Card>
      </div>
    </div>
  );
}
