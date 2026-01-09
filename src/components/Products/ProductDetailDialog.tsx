import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';
import supabase from '@/lib/supabase';
import { decodeHTMLEntities } from '@/lib/htmlUtils';

interface Product {
  id: string;
  model: string;
  product_type: string;
  brand?: string;
  description?: string;
  dimensions?: Record<string, any>;
  image_url?: string;
  product_url?: string;
  price?: number;
  msrp?: number;
  color?: string;
  availability?: string;
  commercial_category?: string;
}

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelNumber: string;
}

export function ProductDetailDialog({
  open,
  onOpenChange,
  modelNumber,
}: ProductDetailDialogProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && modelNumber) {
      fetchProduct();
    }
  }, [open, modelNumber]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          model,
          product_type,
          brand,
          description,
          dimensions,
          image_url,
          product_url,
          price,
          msrp,
          color,
          availability,
          commercial_category
        `)
        .eq('model', modelNumber)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (err) {
      console.error(err);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value?: number) =>
    typeof value === 'number'
      ? `$${value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : product ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-base">
                {product.product_type}
              </Badge>
              {product.brand && <Badge variant="outline">{product.brand}</Badge>}
              {product.color && (
                <Badge variant="outline">Color: {product.color}</Badge>
              )}
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Image */}
              {product.image_url && (
                <Card className="p-3 md:col-span-1">
                  <img
                    src={product.image_url}
                    alt={product.model}
                    className="w-full rounded-md object-contain"
                  />
                </Card>
              )}

              {/* Details */}
              <Card className="p-4 space-y-3 md:col-span-2">
                <div>
                  <span className="text-muted-foreground">Model:</span>{' '}
                  <span className="font-mono font-medium">
                    {product.model}
                  </span>
                </div>

                {product.description && (
                  <div>
                    <span className="text-muted-foreground">
                      Description:
                    </span>{' '}
                    <span className="font-medium">
                      {decodeHTMLEntities(product.description)}
                    </span>
                  </div>
                )}

                {product.dimensions && (
                  <div>
                    <span className="text-muted-foreground">
                      Dimensions:
                    </span>{' '}
                    <span className="font-medium">
                      {Object.entries(product.dimensions)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm pt-2">
                  <div>
                    <span className="text-muted-foreground">Price:</span>{' '}
                    <span className="font-medium">
                      {formatMoney(product.price)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MSRP:</span>{' '}
                    <span className="font-medium">
                      {formatMoney(product.msrp)}
                    </span>
                  </div>

                  {product.availability && (
                    <div>
                      <span className="text-muted-foreground">
                        Availability:
                      </span>{' '}
                      <span className="font-medium">
                        {product.availability}
                      </span>
                    </div>
                  )}

                  {product.commercial_category && (
                    <div>
                      <span className="text-muted-foreground">
                        Category:
                      </span>{' '}
                      <span className="font-medium">
                        {product.commercial_category}
                      </span>
                    </div>
                  )}
                </div>

                {/* External link */}
                {product.product_url && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={product.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        View Product Page
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Product not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
