import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { formatCurrency, customRound } from '../lib/utils';

interface Product {
  id: number;
  name: string;
  packaging: string;
  size: string;
  base_price: number;
  product_type: 'single' | 'area_based';
  rounding_enabled: boolean;
}

interface AreaPrice {
  id: number;
  product_id: number;
  city_id: number;
  price: number;
}

interface FormData {
  name: string;
  packaging: string;
  size: string;
  base_price: string;
  product_type: 'single' | 'area_based';
  rounding_enabled: boolean;
  area_prices: { [key: number]: string };
}

export default function Products() {
  const { db, cities } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [areaPrices, setAreaPrices] = useState<AreaPrice[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    packaging: '',
    size: '',
    base_price: '',
    product_type: 'single',
    rounding_enabled: true,
    area_prices: {}
  });

  useEffect(() => {
    loadProducts();
    loadAreaPrices();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await db.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadAreaPrices = async () => {
    try {
      const data = await db.getAreaPrices();
      setAreaPrices(data);
    } catch (error) {
      console.error('Error loading area prices:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      packaging: '',
      size: '',
      base_price: '',
      product_type: 'single',
      rounding_enabled: true,
      area_prices: {}
    });
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const basePrice = parseFloat(formData.base_price);
      if (isNaN(basePrice)) {
        alert('Harga dasar harus berupa angka');
        return;
      }

      const productData = {
        name: formData.name,
        packaging: formData.packaging,
        size: formData.size,
        base_price: formData.rounding_enabled ? customRound(basePrice) : basePrice,
        product_type: formData.product_type,
        rounding_enabled: formData.rounding_enabled
      };

      let productId: number;

      if (editingProduct) {
        await db.updateProduct(editingProduct.id, productData);
        productId = editingProduct.id;
      } else {
        productId = await db.addProduct(productData);
      }

      // Handle area prices for area-based products
      if (formData.product_type === 'area_based') {
        // Delete existing area prices for this product
        await db.deleteAreaPricesForProduct(productId);
        
        // Add new area prices
        for (const [cityId, priceStr] of Object.entries(formData.area_prices)) {
          const price = parseFloat(priceStr);
          if (!isNaN(price) && price > 0) {
            await db.addAreaPrice({
              product_id: productId,
              city_id: parseInt(cityId),
              price: formData.rounding_enabled ? customRound(price) : price
            });
          }
        }
      }

      await loadProducts();
      await loadAreaPrices();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Terjadi kesalahan saat menyimpan produk');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    
    // Get area prices for this product
    const productAreaPrices: { [key: number]: string } = {};
    areaPrices
      .filter(ap => ap.product_id === product.id)
      .forEach(ap => {
        productAreaPrices[ap.city_id] = ap.price.toString();
      });

    setFormData({
      name: product.name,
      packaging: product.packaging,
      size: product.size,
      base_price: product.base_price.toString(),
      product_type: product.product_type,
      rounding_enabled: product.rounding_enabled ?? true,
      area_prices: productAreaPrices
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      try {
        await db.deleteProduct(id);
        await loadProducts();
        await loadAreaPrices();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Terjadi kesalahan saat menghapus produk');
      }
    }
  };

  const handleAreaPriceChange = (cityId: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      area_prices: {
        ...prev.area_prices,
        [cityId]: value
      }
    }));
  };

  const getAreaPricesForProduct = (productId: number) => {
    return areaPrices.filter(ap => ap.product_id === productId);
  };

  const getCityName = (cityId: number) => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.name : 'Unknown';
  };

  const getPreviewPrice = (price: string, useRounding: boolean) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '';
    return useRounding ? customRound(numPrice) : numPrice;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Produk</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nama Produk</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="packaging">Kemasan</Label>
                    <Input
                      id="packaging"
                      value={formData.packaging}
                      onChange={(e) => setFormData(prev => ({ ...prev, packaging: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="size">Ukuran</Label>
                    <Input
                      id="size"
                      value={formData.size}
                      onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="product_type">Tipe Produk</Label>
                    <Select
                      value={formData.product_type}
                      onValueChange={(value: 'single' | 'area_based') => 
                        setFormData(prev => ({ ...prev, product_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Harga Tunggal</SelectItem>
                        <SelectItem value="area_based">Berdasarkan Area</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rounding_enabled"
                      checked={formData.rounding_enabled}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, rounding_enabled: checked as boolean }))
                      }
                    />
                    <Label htmlFor="rounding_enabled">Aktifkan Pembulatan Otomatis</Label>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {formData.rounding_enabled ? (
                      <p>Harga akan dibulatkan ke kelipatan 100 terdekat (contoh: 25,400 → 25,500)</p>
                    ) : (
                      <p>Harga akan disimpan sesuai input tanpa pembulatan</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="base_price">Harga Dasar</Label>
                    <Input
                      id="base_price"
                      type="number"
                      value={formData.base_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                      required
                    />
                    {formData.base_price && (
                      <div className="mt-1 text-sm text-gray-600">
                        Preview: {formatCurrency(getPreviewPrice(formData.base_price, formData.rounding_enabled))}
                      </div>
                    )}
                  </div>

                  {formData.product_type === 'area_based' && (
                    <div>
                      <Label>Harga per Area</Label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {cities.map(city => (
                          <div key={city.id} className="flex items-center space-x-2">
                            <Label className="w-24 text-sm">{city.name}</Label>
                            <Input
                              type="number"
                              value={formData.area_prices[city.id] || ''}
                              onChange={(e) => handleAreaPriceChange(city.id, e.target.value)}
                              placeholder="Harga"
                              className="flex-1"
                            />
                            {formData.area_prices[city.id] && (
                              <div className="text-xs text-gray-600 w-24">
                                {formatCurrency(getPreviewPrice(formData.area_prices[city.id], formData.rounding_enabled))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Update' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kemasan & Ukuran</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Pembulatan</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    Belum ada produk
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{product.packaging}</p>
                        <p className="text-gray-500">{product.size}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        product.product_type === 'single' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.product_type === 'single' ? 'Harga Tunggal' : 'Berdasarkan Area'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {product.product_type === 'single' ? (
                        <div className="text-sm">
                          {product.rounding_enabled ? (
                            <>Dengan pembulatan: {formatCurrency(product.base_price)}</>
                          ) : (
                            <>Tanpa pembulatan: {formatCurrency(product.base_price)}</>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm space-y-1">
                          <div>Dasar: {formatCurrency(product.base_price)}</div>
                          {getAreaPricesForProduct(product.id).map(areaPrice => (
                            <div key={areaPrice.id} className="text-xs text-gray-600">
                              {getCityName(areaPrice.city_id)}: {formatCurrency(areaPrice.price)}
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        product.rounding_enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.rounding_enabled ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}