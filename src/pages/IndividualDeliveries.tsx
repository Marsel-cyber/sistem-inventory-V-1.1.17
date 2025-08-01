import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Modal } from '../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, User, CheckCircle, Printer, AlertTriangle, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../lib/utils';

interface DeliveryItem {
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  price_type: 'base' | 'area';
  area_price_id?: number;
}

const IndividualDeliveries: React.FC = () => {
  const { individualDeliveries, cities, products, priceAreas, refreshData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [editingDelivery, setEditingDelivery] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_contact: '',
    city_id: '',
    price_area_id: '',
    purchase_date: '',
    status: 'pending',
    price_markup: 'normal',
    discount: 0,
    shipping_cost: 0,
    notes: '',
    show_discount_in_print: true,
    show_shipping_in_print: true
  });
  
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Selesai' }
  ];

  const markupOptions = [
    { value: 'normal', label: 'Normal' },
    { value: '2.5%', label: '2.5%' },
    { value: '5%', label: '5%' },
    { value: '10%', label: '10%' }
  ];

  const itemsPerPageOptions = [
    { value: 5, label: '5 per halaman' },
    { value: 10, label: '10 per halaman' },
    { value: 25, label: '25 per halaman' },
    { value: 50, label: '50 per halaman' }
  ];

  const productOptions = products.map((product: any) => ({
    value: product.id,
    label: `${product.name} - ${product.packaging} ${product.size}`
  }));

  // Get city options for select
  const cityOptions = cities.map((city: any) => ({
    value: city.id,
    label: city.name
  }));

  // Get city name by ID
  const getPriceAreaOptions = () => {
    return [
      { value: '', label: 'Harga Dasar' },
      ...priceAreas.map((area: any) => ({
        value: area.id,
        label: area.name
      }))
    ];
  };

  const getProductPrice = (product: any) => {
    if (!formData.price_area_id) {
      return product.base_price;
    }
    
    const areaPrice = product.area_prices?.find((ap: any) => 
      ap.price_area_id === parseInt(formData.price_area_id)
    );
    
    return areaPrice ? areaPrice.price : product.base_price;
  };

  const handlePriceAreaChange = (priceAreaId: string) => {
    setFormData({ ...formData, price_area_id: priceAreaId });
    
    // Update prices for all existing items
    const updatedItems = deliveryItems.map((item: any) => {
      const product = products.find((p: any) => p.id === item.product_id);
      if (product) {
        const newPrice = priceAreaId ? 
          (product.area_prices?.find((ap: any) => ap.price_area_id === parseInt(priceAreaId))?.price || product.base_price) :
          product.base_price;
        
        return {
          ...item,
          unit_price: newPrice,
          total_price: newPrice * item.quantity
        };
      }
      return item;
    });
    
    setDeliveryItems(updatedItems);
  };

  const getCityName = (cityId: number) => {
    const city = cities.find((c: any) => c.id === cityId);
    return city ? city.name : '-';
  };

  const getProductPrice2 = (productId: number) => {
    const product = products.find((p: any) => p.id === productId);
    if (!product) return 0;

    // If price area is selected, try to get area-specific price
    if (formData.price_area_id) {
      const areaPrice = product.area_prices?.find((ap: any) => 
        ap.price_area_id === parseInt(formData.price_area_id)
      );
      if (areaPrice) {
        return areaPrice.price;
      }
    }

    // Fallback to base price
    return product.base_price;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateMarkupPrice = (basePrice: number, markup: string) => {
    if (markup === 'normal') return basePrice;
    const percentage = parseFloat(markup.replace('%', ''));
    return basePrice * (1 + percentage / 100);
  };

  const roundToThousand = (amount: number) => {
    return Math.round(amount / 1000) * 1000;
  };

  const calculateTotal = () => {
    const itemsTotal = deliveryItems.reduce((sum, item) => sum + item.total_price, 0);
    const discountAmount = (itemsTotal * formData.discount) / 100;
    const afterDiscount = itemsTotal - discountAmount;
    return roundToThousand(afterDiscount + formData.shipping_cost);
  };

  const addDeliveryItem = () => {
    setDeliveryItems([...deliveryItems, {
      product_id: 0,
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      price_type: 'base'
    }]);
  };

  const updateDeliveryItem = (index: number, field: string, value: any) => {
    const newItems = [...deliveryItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'product_id') {
      const product = products.find((p: any) => p.id === parseInt(value));
      if (product) {
        newItems[index].unit_price = getProductPrice(product);
        if (product.product_type === 'package') {
          const packageItems = product.package_items || [];
          let hasEnoughStock = true;
          
          for (const packageItem of packageItems) {
            const componentProduct = products.find((p: any) => p.id === packageItem.product_id);
            if (componentProduct) {
              const requiredStock = packageItem.quantity * newItems[index].quantity;
              if (componentProduct.stock < requiredStock) {
                hasEnoughStock = false;
                break;
              }
            }
          }
          
          if (!hasEnoughStock) {
            toast.error(`Stok komponen dalam paket ${product.name} tidak mencukupi!`);
            return;
          }
        } else if (product.stock === 0) {
          toast.error(`Stok ${product.name} habis! Silakan tambah stok terlebih dahulu.`);
          return;
        }
        
        // Reset price type and calculate base price
        newItems[index].price_type = 'base';
        newItems[index].area_price_id = undefined;
        const markupPrice = calculateMarkupPrice(product.base_price, formData.price_markup);
        newItems[index].unit_price = roundToThousand(markupPrice);
        newItems[index].total_price = roundToThousand(markupPrice * newItems[index].quantity);
      }
    } else if (field === 'price_type') {
      const product = products.find((p: any) => p.id === newItems[index].product_id);
      if (product) {
        if (value === 'base') {
          const markupPrice = calculateMarkupPrice(product.base_price, formData.price_markup);
          newItems[index].unit_price = roundToThousand(markupPrice);
          newItems[index].area_price_id = undefined;
        } else {
          // Set to first area price if available
          const firstAreaPrice = product.area_prices?.[0];
          if (firstAreaPrice) {
            newItems[index].area_price_id = firstAreaPrice.price_area_id;
            const markupPrice = calculateMarkupPrice(firstAreaPrice.price, formData.price_markup);
            newItems[index].unit_price = roundToThousand(markupPrice);
          }
        }
        newItems[index].total_price = roundToThousand(newItems[index].unit_price * newItems[index].quantity);
      }
    } else if (field === 'area_price_id') {
      const product = products.find((p: any) => p.id === newItems[index].product_id);
      if (product) {
        const areaPrice = product.area_prices?.find((ap: any) => ap.price_area_id === parseInt(value));
        if (areaPrice) {
          const markupPrice = calculateMarkupPrice(areaPrice.price, formData.price_markup);
          newItems[index].unit_price = roundToThousand(markupPrice);
          newItems[index].total_price = roundToThousand(markupPrice * newItems[index].quantity);
        }
      }
    } else if (field === 'quantity') {
      const product = products.find((p: any) => p.id === newItems[index].product_id);
      if (product) {
        if (product.product_type === 'package') {
          // For package products, check if component products have enough stock
          const packageItems = product.package_items || [];
          let hasEnoughStock = true;
          
          for (const packageItem of packageItems) {
            const componentProduct = products.find((p: any) => p.id === packageItem.product_id);
            if (componentProduct) {
              const requiredStock = packageItem.quantity * parseInt(value);
              if (componentProduct.stock < requiredStock) {
                hasEnoughStock = false;
                break;
              }
            }
          }
          
          if (!hasEnoughStock) {
            toast.error(`Stok komponen dalam paket ${product.name} tidak mencukupi!`);
            return;
          }
        } else if (parseInt(value) > product.stock) {
          toast.error(`Stok ${product.name} tidak mencukupi! Stok tersedia: ${product.stock}`);
          return;
        }
      }
      
      newItems[index].quantity = parseInt(value) || 1;
      newItems[index].total_price = roundToThousand(newItems[index].quantity * newItems[index].unit_price);
    } else if (field === 'unit_price') {
      newItems[index].total_price = newItems[index].unit_price * parseInt(value);
    }
    
    setDeliveryItems(newItems);
  };

  const removeDeliveryItem = (index: number) => {
    setDeliveryItems(deliveryItems.filter((_, i) => i !== index));
  };

  const getProductStock = (productId: number) => {
    const product = products.find((p: any) => p.id === productId);
    
    if (!product) return 0;
    
    // For package products, calculate available stock based on component products
    if (product.product_type === 'package') {
      const packageItems = product.package_items || [];
      if (packageItems.length === 0) return 0;
      
      // Calculate how many complete packages can be made based on component stock
      return packageItems.reduce((minPackages: number, item: any) => {
        const componentProduct = products.find((p: any) => p.id === item.product_id);
        if (!componentProduct) return 0;
        
        const availablePackages = Math.floor(componentProduct.stock / item.quantity);
        return minPackages === null ? availablePackages : Math.min(minPackages, availablePackages);
      }, null);
    }
    
    return product.stock;
  };

  const getProductAreaPrices = (productId: number) => {
    const product = products.find((p: any) => p.id === productId);
    return product?.area_prices || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (deliveryItems.length === 0) {
      toast.error('Tambahkan minimal satu item pengiriman');
      return;
    }

    // Check stock availability
    for (const item of deliveryItems) {
      const product = products.find((p: any) => p.id === item.product_id);
      if (!product) {
        toast.error('Produk tidak ditemukan');
        return;
      }
      
      if (product.product_type === 'package') {
        // For package products, check component stock
        const hasEnoughStock = await db.checkPackageStock(product.id, item.quantity);
        if (!hasEnoughStock) {
          toast.error(`Stok komponen dalam paket ${product.name} tidak mencukupi!`);
          return;
        }
      } else if (product.stock === 0) {
        toast.error(`Stok ${product.name} habis! Silakan tambah stok terlebih dahulu.`);
        return;
      } else if (item.quantity > product.stock) {
        toast.error(`Stok ${product.name} tidak mencukupi! Stok tersedia: ${product.stock}`);
        return;
      }
    }

    try {
      const deliveryData = {
        ...formData,
        total_amount: calculateTotal(),
        price_area_id: formData.price_area_id ? parseInt(formData.price_area_id) : null
      };

      if (editingDelivery) {
        await db.updateIndividualDelivery(editingDelivery.id, deliveryData, deliveryItems);
        toast.success('Pengiriman berhasil diperbarui');
      } else {
        await db.addIndividualDelivery(deliveryData, deliveryItems);
        toast.success('Pengiriman berhasil ditambahkan');
      }
      
      resetForm();
      refreshData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (delivery: any) => {
    setEditingDelivery(delivery);
    setFormData({
      customer_name: delivery.customer_name,
      customer_contact: delivery.customer_contact || '',
      city_id: delivery.city_id?.toString() || '',
      purchase_date: delivery.purchase_date,
      price_area_id: delivery.price_area_id ? delivery.price_area_id.toString() : '',
      status: delivery.status,
      price_markup: delivery.price_markup,
      discount: delivery.discount,
      shipping_cost: delivery.shipping_cost,
      notes: delivery.notes || '',
      show_discount_in_print: delivery.show_discount_in_print !== false,
      show_shipping_in_print: delivery.show_shipping_in_print !== false
    });
    setDeliveryItems(delivery.items || []);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus pengiriman ini?')) {
      try {
        await db.deleteIndividualDelivery(id);
        toast.success('Pengiriman berhasil dihapus');
        refreshData();
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      const delivery = individualDeliveries.find((d: any) => d.id === id);
      if (delivery) {
        const deliveryData = {
          ...delivery,
          status: newStatus
        };
        await db.updateIndividualDelivery(id, deliveryData, delivery.items);
        toast.success('Status berhasil diperbarui');
        refreshData();
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handlePrintInvoice = (delivery: any) => {
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      const itemsTotal = delivery.items?.reduce((sum: number, item: any) => sum + item.total_price, 0) || 0;
      const discountAmount = (itemsTotal * delivery.discount) / 100;
      const afterDiscount = itemsTotal - discountAmount;
      const total = afterDiscount + delivery.shipping_cost;

      printWindow.document.write(`
       <html>

<head>
    <title>Faktur Penjualan - ${delivery.id}</title>
    <style>
        body {
    font-family: 'Consolas', 'Lucida Console', monospace;
            /* font-size: 11px; */
            /* Global base font size for most small text */
            margin: 40px;
            color: #000;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
            /* Sesuaikan margin bawah header agar tidak terlalu jauh dari tabel */
        }

        .company-info {
            font-size: 11px;
            line-height: 1.5;
            /* Sesuaikan line-height agar rapat */
        }

        .company-info img {
            width: 200px;
            /* Lebar logo */
            margin-bottom: 5px;
            /* Sedikit jarak di bawah logo */
        }

        .halal-cert {
            display: flex;
            align-items: center;
        }

        .halal-cert img {
            width: 50px;
            /* Lebar logo halal */
            margin-right: 10px;
        }

        .halal-cert div span {
            font-size: 11px;
            /* Font size untuk info DEP. KES, TELP, ADMIN */
            line-height: 1.3;
            /* Line-height lebih rapat */
            display: block;
            /* Pastikan setiap span di baris baru */
        }

        .invoice-info {
            text-align: right;
            font-size: 11px;
            /* Font size default untuk info faktur */
            line-height: 1.4;
        }

        .invoice-info .invoice-title {
            font-weight: bold;
            font-size: 14px;
            /* "FAKTUR PENJUALAN" */
            margin-bottom: 5px;
            /* Jarak judul dengan info faktur */
        }

        .invoice-info strong {
            display: inline-block;
            width: 85px;
            /* Sesuaikan lebar strong agar alignment rapi untuk "No. Faktur", "Tanggal" */
            vertical-align: top;
            /* Memastikan strong rata atas dengan teksnya */
        }

        /* Styling for the customer info block inside invoice-info */
        .customer-block {
            margin-top: 10px;
            /* Jarak antara tanggal dan "Kepada Yth" */
            font-size: 11px;
            /* Base font size untuk blok ini */
            line-height: 1.4;
        }

        .customer-block strong {
            /* Override width dari .invoice-info strong jika tidak diinginkan */
            width: auto;
            /* Agar tidak terbatasi width 85px */
            display: inline;
            /* Kembali ke inline, karena sudah ada <br> */
            font-size: 12px;
            /* Font size untuk "Kepada Yth Tuan/Toko" */
            font-weight: bold;
        }

        .customer-block .customer-name {
            font-size: 18px !important;
            /* Font size untuk NAMA TOKO, SANGAT PENTING untuk match gambar */
            font-weight: bold;
            text-transform: uppercase;
            line-height: 1.1;
            /* Line-height untuk nama toko */
            display: block;
            /* Pastikan nama toko di baris baru */
            margin-bottom: 2px;
            /* Sedikit jarak antara nama toko dan kota/telp */
        }


        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            /* Jarak tabel dari header/customer info */
            font-size: 11px;
            /* Base font size untuk tabel */
        }

        th,
        td {
            border: 1px solid #ccc;
            padding: 4px;
            text-align: left;
            font-size: 11px;
            /* Pastikan font size sel tabel standar */
        }

        th {
            background-color: #f2f2f2;
            font-weight: bold;
            font-size: 12px;
            /* Font size untuk header kolom tabel */
        }

        th:nth-child(3),
        /* Qty */
        th:nth-child(4),
        /* Harga Satuan */
        th:nth-child(5) {
            /* Total */
            text-align: right;
        }


        /* Styles for the total rows within the main table */
        .total-row td {
            border: none;
            padding-top: 2px;
            padding-bottom: 2px;
            font-size: 13px !important;
            /* Font size for total rows, disesuaikan agar mirip gambar */
        }

        .total-row .total-label {
            text-align: right;
            font-weight: normal;
        }

        .total-row .total-value {
            text-align: right;
            font-weight: bold;
            white-space: nowrap;
            border: 1px solid #ccc !important;
        }

        .grand-total .total-value {
            border-top: 1px solid #000 !important;
            border-bottom: 1px solid #000 !important;
        }

        /* Styling for the notes section */
        .notes-section {
            margin-top: 15px;
            font-size: 11px;
            /* Font size catatan */
            line-height: 1.5;
        }

        .notes-section strong {
            font-weight: bold;
        }

        .footer-sign {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            font-size: 11px;
            /* Font size untuk Penerima/Hormat Kami */
            padding: 0 10px;
        }

        @media print {
            body {
                margin: 0;
            }
        }
    </style>
</head>

<body>
    <div class="header">
        <div class="company-info">
            <img src="https://risnacookies.com/wp-content/uploads/2025/02/Risna-Cookies-Desain-02-e1740218556622.png"
                alt="Logo" width="200"><br>
            <div class="halal-cert">
                <img src="src/components/assets/halal.png" alt="Logo Halal" width="50">
                <div>
                    <span>DEP. KES. RI. P-IRT NO. 2053374020970-28</span>
                    <span>TELP (024) 8442782 SEMARANG</span>
                    <span>ADMIN. 0822 5758 8586</span>
                </div>
            </div>
        </div>

        <div class="invoice-info">
            <div class="invoice-title">FAKTUR PENJUALAN</div>
            <div><strong>No. Faktur:</strong> ${delivery.id}</div>
            <div><strong>Tanggal:</strong> ${new Date(delivery.purchase_date).toLocaleDateString('id-ID')}</div>

            <div class="customer-block">
                <strong>Kepada Yth Tuan/Toko:</strong><br>
                <span class="customer-name">${delivery.customer_name}</span>
                ${delivery.city_id ? `<span>${getCityName(delivery.city_id)}</span>` : ''}
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Nama Produk</th>
                <th>Qty</th>
                <th>Harga Satuan</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${delivery.items?.map((item: any, index: number) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.product_name}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">${formatCurrency(item.unit_price)}</td>
                <td style="text-align: right;">${formatCurrency(item.total_price)}</td>
            </tr>
            `).join('') || ''}

            <tr class="total-row">
                <td colspan="3"></td>
                <td class="total-label" style="padding-top: 1rem;">Total Harga:</td>
                <td class="total-value" style="padding-top: 1rem;">${formatCurrency(itemsTotal)}</td>
            </tr>
            ${delivery.show_discount_in_print && delivery.discount > 0 ? `
            <tr class="total-row">
                <td colspan="3"></td>
                <td class="total-label">Diskon (${delivery.discount}%):</td>
                <td class="total-value">-${formatCurrency(discountAmount)}</td>
            </tr>` : ''}
            ${delivery.show_shipping_in_print && delivery.shipping_cost > 0 ? `
            <tr class="total-row">
                <td colspan="3"></td>
                <td class="total-label">Ongkos Kirim:</td>
                <td class="total-value">${formatCurrency(delivery.shipping_cost)}</td>
            </tr>` : ''}
            <tr class="total-row grand-total">
                <td colspan="3"></td>
                <td class="total-label"><strong>Total Keseluruhan:</strong></td>
                <td class="total-value"><strong>${formatCurrency(total)}</strong></td>
            </tr>
        </tbody>
    </table>

    ${delivery.notes ? `<div class="notes-section"><strong>Catatan:</strong> ${delivery.notes}</div>` : ''}

    <div class="footer-sign">
        <div>Penerima</div>
        <div>Hormat Kami</div>
    </div>
</body>

</html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_contact: '',
      city_id: '',
      price_area_id: '',
      purchase_date: '',
      status: 'pending',
      price_markup: 'normal',
      discount: 0,
      shipping_cost: 0,
      notes: '',
      show_discount_in_print: true,
      show_shipping_in_print: true
    });
    setDeliveryItems([]);
    setEditingDelivery(null);
    setShowForm(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      completed: { color: 'bg-emerald-100 text-emerald-800', label: 'Selesai' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Filter deliveries based on search term and status
  const filteredDeliveries = individualDeliveries.filter((delivery: any) => {
    const matchesSearch = searchTerm === '' || 
      delivery.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delivery.customer_contact && delivery.customer_contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (delivery.notes && delivery.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === '' || delivery.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDeliveries = filteredDeliveries.slice(startIndex, endIndex);

  const totalAmount = filteredDeliveries.reduce((sum: number, delivery: any) => sum + delivery.total_amount, 0);
  const totalProducts = filteredDeliveries.reduce((sum: number, delivery: any) => 
    sum + (delivery.items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0), 0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengiriman Perorangan</h1>
          <p className="text-gray-600 mt-1">Kelola pengiriman ke pelanggan perorangan dengan harga area</p>
        </div>
        <Button onClick={() => setShowForm(true)} icon={Plus}>
          Tambah Pengiriman
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari Pengiriman
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari berdasarkan nama pelanggan, kontak, atau catatan..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <Select
            label="Filter Status"
            value={filterStatus}
            onChange={(value) => {
              setFilterStatus(value.toString());
              setCurrentPage(1);
            }}
            options={[{ value: '', label: 'Semua Status' }, ...statusOptions]}
            className="flex-1"
          />
          <Select
            label="Items per Halaman"
            value={itemsPerPage}
            onChange={(value) => {
              setItemsPerPage(parseInt(value.toString()));
              setCurrentPage(1);
            }}
            options={itemsPerPageOptions}
            className="flex-1"
          />
          <Button
            variant="secondary"
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('');
              setCurrentPage(1);
            }}
          >
            Reset Filter
          </Button>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredDeliveries.length)} dari {filteredDeliveries.length} pengiriman
            {(searchTerm || filterStatus) && ` (difilter dari ${individualDeliveries.length} total)`}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? "primary" : "secondary"}
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8"
                    >
                      {page}
                    </Button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="text-gray-500">...</span>
                    <Button
                      size="sm"
                      variant={currentPage === totalPages ? "primary" : "secondary"}
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-8 h-8"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex flex-col sm:flex-row gap-4 text-sm text-gray-600">
          <div>Total Pengiriman: <span className="font-medium">{filteredDeliveries.length}</span></div>
          <div>Total Produk: <span className="font-medium">{totalProducts}</span></div>
          <div>Total Nilai: <span className="font-medium">{formatCurrency(totalAmount)}</span></div>
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Detail Pengiriman #${selectedDelivery?.id}`}
        size="2xl"
      >
        {selectedDelivery && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informasi Pengiriman</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-medium">{selectedDelivery.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pelanggan:</span>
                    <span className="font-medium">{selectedDelivery.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kontak:</span>
                    <span className="font-medium">{selectedDelivery.customer_contact || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kota:</span>
                    <span className="font-medium">{getCityName(selectedDelivery.city_id)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tanggal Beli:</span>
                    <span className="font-medium">{new Date(selectedDelivery.purchase_date).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span>{getStatusBadge(selectedDelivery.status)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informasi Tambahan</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Markup Harga:</span>
                    <span className="font-medium">{selectedDelivery.price_markup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Diskon:</span>
                    <span className="font-medium">{selectedDelivery.discount}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ongkos Kirim:</span>
                    <span className="font-medium">{formatCurrency(selectedDelivery.shipping_cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium text-lg">{formatCurrency(selectedDelivery.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Item Pengiriman</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Harga Satuan</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedDelivery.items?.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedDelivery.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Catatan</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedDelivery.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingDelivery ? 'Edit Pengiriman' : 'Tambah Pengiriman Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Nama Pelanggan"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Masukkan nama pelanggan"
                required
              />
              <Input
                label="Kontak Pelanggan"
                value={formData.customer_contact}
                onChange={(e) => setFormData({ ...formData, customer_contact: e.target.value })}
                placeholder="Nomor telepon / WhatsApp"
              />
              <SearchableSelect
                label="Kota"
                value={formData.city_id}
                onChange={(value) => setFormData({ ...formData, city_id: value.toString() })}
                options={cityOptions}
                placeholder="Pilih kota"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Tanggal Beli"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
              />
              <Select
                label="Status"
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value.toString() })}
                options={statusOptions}
              />
              <Select
                label="Area Harga"
                value={formData.price_area_id}
                onChange={(value) => handlePriceAreaChange(value.toString())}
                options={getPriceAreaOptions()}
                placeholder="Pilih area harga"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                label="Markup Harga"
                value={formData.price_markup}
                onChange={(value) => {
                  setFormData({ ...formData, price_markup: value.toString() });
                  // Recalculate item prices when markup changes
                  const newItems = deliveryItems.map(item => {
                    const product = products.find((p: any) => p.id === item.product_id);
                    if (product) {
                      let basePrice = product.base_price;
                      if (item.price_type === 'area' && item.area_price_id) {
                        const areaPrice = product.area_prices?.find((ap: any) => ap.price_area_id === item.area_price_id);
                        if (areaPrice) basePrice = areaPrice.price;
                      }
                      const markupPrice = calculateMarkupPrice(basePrice, value.toString());
                      return {
                        ...item,
                        unit_price: roundToThousand(markupPrice),
                        total_price: roundToThousand(markupPrice * item.quantity)
                      };
                    }
                    return item;
                  });
                  setDeliveryItems(newItems);
                }}
                options={markupOptions}
              />
              <Input
                label="Diskon (%)"
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                min={0}
                max={100}
                step={0.1}
              />
              <Input
                label="Ongkos Kirim"
                type="number"
                value={formData.shipping_cost}
                onChange={(e) => setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_discount_in_print"
                  checked={formData.show_discount_in_print}
                  onChange={(e) => setFormData({ ...formData, show_discount_in_print: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="show_discount_in_print" className="text-sm text-gray-700">
                  Tampilkan diskon di nota
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_shipping_in_print"
                  checked={formData.show_shipping_in_print}
                  onChange={(e) => setFormData({ ...formData, show_shipping_in_print: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="show_shipping_in_print" className="text-sm text-gray-700">
                  Tampilkan ongkir di nota
                </label>
              </div>
            </div>

            <Input
              label="Catatan"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Catatan tambahan"
            />

            {/* Delivery Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Item Pengiriman</h3>
                <Button type="button" onClick={addDeliveryItem} size="sm">
                  Tambah Item
                </Button>
              </div>
              
              <div className="space-y-4">
                {deliveryItems.map((item, index) => {
                  const product = products.find((p: any) => p.id === item.product_id);
                  const areaPrices = getProductAreaPrices(item.product_id);
                  
                  // For package products, calculate available stock differently
                  let stock = 0;
                  let stockDisplay = '';
                  
                  if (product) {
                    if (product.product_type === 'package') {
                      // Calculate available stock based on component products
                      const packageStock = getProductStock(product.id);
                      stock = packageStock;
                      stockDisplay = `${packageStock} paket`;
                    } else {
                      stock = product.stock;
                      stockDisplay = `${product.stock_dozen}d ${product.stock_pcs}p`;
                    }
                  }
                  
                  return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-8 gap-4 p-4 border border-gray-200 rounded-lg">
                      <SearchableSelect
                        label="Produk"
                        value={item.product_id}
                        onChange={(value) => updateDeliveryItem(index, 'product_id', parseInt(value.toString()))}
                        options={productOptions}
                        placeholder="Pilih produk"
                        required
                        className="md:col-span-2"
                      />
                      <Select
                        label="Tipe Harga"
                        value={item.price_type}
                        onChange={(value) => updateDeliveryItem(index, 'price_type', value.toString())}
                        options={[
                          { value: 'base', label: 'Harga Dasar' },
                          { value: 'area', label: 'Harga Area' }
                        ]}
                        required
                      />
                      {item.price_type === 'area' && areaPrices.length > 0 && (
                        <Select
                          label="Area Harga"
                          value={item.area_price_id || ''}
                          onChange={(value) => updateDeliveryItem(index, 'area_price_id', parseInt(value.toString()))}
                          options={areaPrices.map((ap: any) => ({
                            value: ap.price_area_id,
                            label: priceAreas.find((pa: any) => pa.id === ap.price_area_id)?.name || 'Unknown'
                          }))}
                          placeholder="Pilih area"
                          required
                        />
                      )}
                      <Input
                        label="Jumlah"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateDeliveryItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        min={1}
                        required
                      />
                      <Input
                        label="Harga Satuan"
                        type="number"
                        value={item.unit_price}
                        disabled
                        className="bg-gray-100"
                      />
                      <Input
                        label="Total Harga"
                        type="number"
                        value={item.total_price}
                        disabled
                        className="bg-gray-100"
                      />
                      <div className="flex flex-col">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Stok</label>
                        <div className={`flex items-center px-3 py-2 border rounded-lg ${
                          stock === 0 ? 'bg-red-50 border-red-300' : 
                          product && product.product_type === 'single' && stock < 10 ? 'bg-yellow-50 border-yellow-300' : 
                          'bg-green-50 border-green-300'
                        }`}>
                          {stock === 0 && <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />}
                          <span className={`text-sm font-medium ${
                            stock === 0 ? 'text-red-700' : 
                            product && product.product_type === 'single' && stock < 10 ? 'text-yellow-700' : 
                            'text-green-700'
                          }`}>
                            {stockDisplay}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeDeliveryItem(index)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {deliveryItems.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-right space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(deliveryItems.reduce((sum, item) => sum + item.total_price, 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Diskon ({formData.discount}%):</span>
                      <span>-{formatCurrency((deliveryItems.reduce((sum, item) => sum + item.total_price, 0) * formData.discount) / 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ongkos Kirim:</span>
                      <span>{formatCurrency(formData.shipping_cost)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-medium border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit">
                {editingDelivery ? 'Perbarui' : 'Simpan'}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead>Tanggal Beli</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentDeliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchTerm || filterStatus ? 'Tidak ada pengiriman yang sesuai dengan filter' : 'Belum ada data pengiriman perorangan'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              currentDeliveries.map((delivery: any) => (
                <TableRow key={delivery.id}>
                  <TableCell>{delivery.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="font-medium">{delivery.customer_name}</p>
                        <p className="text-sm text-gray-500">
                          {delivery.items?.length || 0} item
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {delivery.customer_contact || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className="font-medium text-blue-600">
                        {getCityName(delivery.city_id)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(delivery.purchase_date).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(delivery.status)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(delivery.total_amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Eye}
                        onClick={() => {
                          setSelectedDelivery(delivery);
                          setShowDetailModal(true);
                        }}
                      >
                        Detail
                      </Button>
                      {delivery.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="success"
                          icon={CheckCircle}
                          onClick={() => handleStatusUpdate(delivery.id, 'completed')}
                        >
                          Selesai
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit}
                        onClick={() => handleEdit(delivery)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Printer}
                        onClick={() => handlePrintInvoice(delivery)}
                      >
                        Cetak
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(delivery.id)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default IndividualDeliveries;