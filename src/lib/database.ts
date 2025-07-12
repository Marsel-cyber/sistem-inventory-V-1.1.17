// This file would contain the database implementation
// For this example, we're using localStorage as a simple database

class Database {
  private storage: Storage;
  private prefix: string;

  constructor() {
    this.storage = localStorage;
    this.prefix = 'risna_cookies_';
    this.initializeData();
  }

  private initializeData() {
    // Initialize data if not exists
    if (!this.storage.getItem(`${this.prefix}initialized`)) {
      // Set initial data
      this.storage.setItem(`${this.prefix}cities`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}price_areas`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}stores`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}products`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}store_deliveries`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}individual_deliveries`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}returns`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}employees`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}payrolls`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}raw_materials`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}factory_productions`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}stock_reductions`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}recipes`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}hpp`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}assets`, JSON.stringify([]));
      this.storage.setItem(`${this.prefix}admin_settings`, JSON.stringify({
        pin: '123456',
        lockedMenus: [],
        hiddenMenus: [],
        menuPins: {},
        profile: {
          name: 'Admin',
          email: 'admin@example.com'
        },
        users: [
          {
            id: 1,
            name: 'Admin',
            role: 'admin',
            pin: '123456',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: 'Kasir',
            role: 'kasir',
            pin: '654321',
            created_at: new Date().toISOString()
          }
        ]
      }));
      
      this.storage.setItem(`${this.prefix}initialized`, 'true');
    }
  }

  // Generic CRUD operations
  private getItem<T>(key: string): T[] {
    const data = this.storage.getItem(`${this.prefix}${key}`);
    return data ? JSON.parse(data) : [];
  }

  private setItem<T>(key: string, data: T[]): void {
    this.storage.setItem(`${this.prefix}${key}`, JSON.stringify(data));
  }

  private getNextId<T extends { id: number }>(items: T[]): number {
    return items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
  }

  // Login
  async login(pin: string): Promise<{ success: boolean, role: string }> {
    const adminSettings = JSON.parse(this.storage.getItem(`${this.prefix}admin_settings`) || '{}');
    
    // Check admin PIN
    if (adminSettings.pin === pin) {
      return { success: true, role: 'admin' };
    }
    
    // Check user PINs
    const user = adminSettings.users?.find((u: any) => u.pin === pin);
    if (user) {
      return { success: true, role: user.role };
    }
    
    return { success: false, role: '' };
  }

  // Verify PIN for menu access
  async verifyPin(pin: string): Promise<boolean> {
    const adminSettings = JSON.parse(this.storage.getItem(`${this.prefix}admin_settings`) || '{}');
    return adminSettings.pin === pin;
  }

  // Verify menu-specific PIN
  async verifyMenuPin(menuId: string, pin: string): Promise<boolean> {
    const adminSettings = JSON.parse(this.storage.getItem(`${this.prefix}admin_settings`) || '{}');
    return adminSettings.menuPins?.[menuId] === pin;
  }

  // Admin Settings
  async getAdminSettings(): Promise<any> {
    return JSON.parse(this.storage.getItem(`${this.prefix}admin_settings`) || '{}');
  }

  async updateAdminSettings(settings: any): Promise<void> {
    this.storage.setItem(`${this.prefix}admin_settings`, JSON.stringify(settings));
  }

  // Cities
  async getCities(): Promise<any[]> {
    const cities = this.getItem<any>('cities');
    
    // Add store count to each city
    const stores = this.getItem<any>('stores');
    return cities.map(city => {
      const storeCount = stores.filter(store => store.city_id === city.id).length;
      return { ...city, store_count: storeCount };
    });
  }

  async addCity(name: string): Promise<void> {
    const cities = this.getItem<any>('cities');
    const newCity = {
      id: this.getNextId(cities),
      name,
      created_at: new Date().toISOString()
    };
    cities.push(newCity);
    this.setItem('cities', cities);
  }

  async updateCity(id: number, name: string): Promise<void> {
    const cities = this.getItem<any>('cities');
    const index = cities.findIndex(city => city.id === id);
    if (index !== -1) {
      cities[index].name = name;
      this.setItem('cities', cities);
    }
  }

  async deleteCity(id: number): Promise<void> {
    const cities = this.getItem<any>('cities');
    const filteredCities = cities.filter(city => city.id !== id);
    this.setItem('cities', filteredCities);
  }

  async getCityStores(cityId: number): Promise<any[]> {
    const stores = this.getItem<any>('stores');
    return stores.filter(store => store.city_id === cityId);
  }

  // Price Areas
  async getPriceAreas(): Promise<any[]> {
    return this.getItem<any>('price_areas');
  }

  async addPriceArea(name: string): Promise<void> {
    const areas = this.getItem<any>('price_areas');
    const newArea = {
      id: this.getNextId(areas),
      name,
      created_at: new Date().toISOString()
    };
    areas.push(newArea);
    this.setItem('price_areas', areas);
  }

  async updatePriceArea(id: number, name: string): Promise<void> {
    const areas = this.getItem<any>('price_areas');
    const index = areas.findIndex(area => area.id === id);
    if (index !== -1) {
      areas[index].name = name;
      this.setItem('price_areas', areas);
    }
  }

  async deletePriceArea(id: number): Promise<void> {
    const areas = this.getItem<any>('price_areas');
    const filteredAreas = areas.filter(area => area.id !== id);
    this.setItem('price_areas', filteredAreas);
  }

  // Stores
  async getStores(): Promise<any[]> {
    const stores = this.getItem<any>('stores');
    const cities = this.getItem<any>('cities');
    
    // Add city name to each store
    return stores.map(store => {
      const city = cities.find(city => city.id === store.city_id);
      return { ...store, city_name: city ? city.name : 'Unknown' };
    });
  }

  async addStore(name: string, address: string, cityId: number, contacts: any): Promise<void> {
    const stores = this.getItem<any>('stores');
    const newStore = {
      id: this.getNextId(stores),
      name,
      address,
      city_id: cityId,
      contact_billing_name: contacts.billing_name,
      contact_billing_phone: contacts.billing_phone,
      contact_purchasing_name: contacts.purchasing_name,
      contact_purchasing_phone: contacts.purchasing_phone,
      contact_store_name: contacts.store_name,
      contact_store_phone: contacts.store_phone,
      created_at: new Date().toISOString()
    };
    stores.push(newStore);
    this.setItem('stores', stores);
  }

  async updateStore(id: number, name: string, address: string, cityId: number, contacts: any): Promise<void> {
    const stores = this.getItem<any>('stores');
    const index = stores.findIndex(store => store.id === id);
    if (index !== -1) {
      stores[index] = {
        ...stores[index],
        name,
        address,
        city_id: cityId,
        contact_billing_name: contacts.billing_name,
        contact_billing_phone: contacts.billing_phone,
        contact_purchasing_name: contacts.purchasing_name,
        contact_purchasing_phone: contacts.purchasing_phone,
        contact_store_name: contacts.store_name,
        contact_store_phone: contacts.store_phone
      };
      this.setItem('stores', stores);
    }
  }

  async deleteStore(id: number): Promise<void> {
    const stores = this.getItem<any>('stores');
    const filteredStores = stores.filter(store => store.id !== id);
    this.setItem('stores', filteredStores);
  }

  // Products
  async getProducts(): Promise<any[]> {
    const products = this.getItem<any>('products');
    const hpps = this.getItem<any>('hpp');
    
    // Calculate total stock for each product
    return products.map(product => {
      // For single products, calculate total stock
      if (product.product_type === 'single') {
        const totalStock = (product.stock_dozen * 12) + product.stock_pcs;
        
        // Find HPP price if exists
        const productHpp = hpps.find((hpp: any) => hpp.product_id === product.id);
        
        return { 
          ...product, 
          stock: totalStock,
          hpp_price: productHpp ? productHpp.final_selling_price : null
        };
      } 
      // For package products, calculate availability based on component products
      else if (product.product_type === 'package') {
        // Find HPP price if exists
        const productHpp = hpps.find((hpp: any) => hpp.product_id === product.id);
        
        // For packages, we don't track stock directly
        return { 
          ...product, 
          stock: null, // Will be calculated dynamically when needed
          hpp_price: productHpp ? productHpp.final_selling_price : null
        };
      }
      
      return product;
    });
  }

  async addProduct(
    name: string,
    packaging: string,
    size: string,
    type: string,
    productType: string,
    stockDozen: number,
    stockPcs: number,
    minimumStock: number,
    basePrice: number,
    roundingEnabled: boolean,
    areaPrices: any[],
    packageItems: any[]
  ): Promise<void> {
    const products = this.getItem<any>('products');
    const newProduct = {
      id: this.getNextId(products),
      name,
      packaging,
      size,
      type,
      product_type: productType,
      stock_dozen: stockDozen,
      stock_pcs: stockPcs,
      minimum_stock: minimumStock,
      base_price: basePrice,
      rounding_enabled: roundingEnabled,
      area_prices: areaPrices,
      package_items: packageItems,
      created_at: new Date().toISOString()
    };
    products.push(newProduct);
    this.setItem('products', products);
  }

  async updateProduct(
    id: number,
    name: string,
    packaging: string,
    size: string,
    type: string,
    productType: string,
    stockDozen: number,
    stockPcs: number,
    minimumStock: number,
    basePrice: number,
    roundingEnabled: boolean,
    areaPrices: any[],
    packageItems: any[]
  ): Promise<void> {
    const products = this.getItem<any>('products');
    const index = products.findIndex(product => product.id === id);
    if (index !== -1) {
      products[index] = {
        ...products[index],
        name,
        packaging,
        size,
        type,
        product_type: productType,
        stock_dozen: stockDozen,
        stock_pcs: stockPcs,
        minimum_stock: minimumStock,
        base_price: basePrice,
        rounding_enabled: roundingEnabled,
        area_prices: areaPrices,
        package_items: packageItems
      };
      this.setItem('products', products);
    }
  }

  async deleteProduct(id: number): Promise<void> {
    const products = this.getItem<any>('products');
    const filteredProducts = products.filter(product => product.id !== id);
    this.setItem('products', filteredProducts);
  }

  async updateProductStock(productId: number, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    const products = this.getItem<any>('products');
    const index = products.findIndex(product => product.id === productId);
    
    if (index !== -1) {
      const product = products[index];
      
      // Calculate current total stock in pieces
      const currentTotalPieces = (product.stock_dozen * 12) + product.stock_pcs;
      
      // Calculate new total stock
      let newTotalPieces;
      if (operation === 'add') {
        newTotalPieces = currentTotalPieces + amount;
      } else {
        newTotalPieces = Math.max(0, currentTotalPieces - amount);
      }
      
      // Convert back to dozens and pieces
      const newDozen = Math.floor(newTotalPieces / 12);
      const newPcs = newTotalPieces % 12;
      
      // Update product stock
      products[index].stock_dozen = newDozen;
      products[index].stock_pcs = newPcs;
      
      this.setItem('products', products);
    }
  }

  async updateProductStockByUnit(productId: number, dozen: number, pcs: number, operation: 'add' | 'subtract'): Promise<void> {
    const products = this.getItem<any>('products');
    const index = products.findIndex(product => product.id === productId);
    
    if (index !== -1) {
      const product = products[index];
      
      // Calculate current total stock in pieces
      const currentTotalPieces = (product.stock_dozen * 12) + product.stock_pcs;
      
      // Calculate change in pieces
      const changePieces = (dozen * 12) + pcs;
      
      // Calculate new total stock
      let newTotalPieces;
      if (operation === 'add') {
        newTotalPieces = currentTotalPieces + changePieces;
      } else {
        newTotalPieces = Math.max(0, currentTotalPieces - changePieces);
      }
      
      // Convert back to dozens and pieces
      const newDozen = Math.floor(newTotalPieces / 12);
      const newPcs = newTotalPieces % 12;
      
      // Update product stock
      products[index].stock_dozen = newDozen;
      products[index].stock_pcs = newPcs;
      
      this.setItem('products', products);
    }
  }

  async updatePackageProductStock(packageId: number, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    const products = this.getItem<any>('products');
    const packageIndex = products.findIndex(product => product.id === packageId);
    
    if (packageIndex !== -1 && products[packageIndex].product_type === 'package') {
      const packageProduct = products[packageIndex];
      const packageItems = packageProduct.package_items || [];
      
      // Update stock for each product in the package
      for (const item of packageItems) {
        const productIndex = products.findIndex(product => product.id === item.product_id);
        if (productIndex !== -1) {
          const product = products[productIndex];
          
          // Calculate current total stock in pieces
          const currentTotalPieces = (product.stock_dozen * 12) + product.stock_pcs;
          
          // Calculate change in pieces (item quantity * package amount)
          const changePieces = item.quantity * amount;
          
          // Calculate new total stock
          let newTotalPieces;
          if (operation === 'add') {
            newTotalPieces = currentTotalPieces + changePieces;
          } else {
            newTotalPieces = Math.max(0, currentTotalPieces - changePieces);
          }
          
          // Convert back to dozens and pieces
          const newDozen = Math.floor(newTotalPieces / 12);
          const newPcs = newTotalPieces % 12;
          
          // Update product stock
          products[productIndex].stock_dozen = newDozen;
          products[productIndex].stock_pcs = newPcs;
        }
      }
      
      this.setItem('products', products);
    }
  }

  async reduceProductStock(productId: number, amount: number, reason: string, notes: string = ''): Promise<void> {
    // First reduce the stock
    await this.updateProductStock(productId, amount, 'subtract');
    
    // Then record the reduction
    const reductions = this.getItem<any>('stock_reductions');
    const newReduction = {
      id: this.getNextId(reductions),
      product_id: productId,
      amount,
      reason,
      notes,
      date: new Date().toISOString()
    };
    reductions.push(newReduction);
    this.setItem('stock_reductions', reductions);
  }

  async getStockReductions(productId: number): Promise<any[]> {
    const reductions = this.getItem<any>('stock_reductions');
    return reductions.filter(reduction => reduction.product_id === productId);
  }

  // Check if a package product has enough stock in its component products
  async checkPackageStock(packageId: number, quantity: number): Promise<boolean> {
    const products = this.getItem<any>('products');
    const packageProduct = products.find(product => product.id === packageId && product.product_type === 'package');
    
    if (!packageProduct) return false;
    
    const packageItems = packageProduct.package_items || [];
    
    // Check if all component products have enough stock
    for (const item of packageItems) {
      const product = products.find(p => p.id === item.product_id);
      if (!product) return false;
      
      const totalStock = (product.stock_dozen * 12) + product.stock_pcs;
      const requiredStock = item.quantity * quantity;
      
      if (totalStock < requiredStock) {
        return false;
      }
    }
    
    return true;
  }

  // Store Deliveries
  async getStoreDeliveries(): Promise<any[]> {
    const deliveries = this.getItem<any>('store_deliveries');
    const stores = this.getItem<any>('stores');
    const cities = this.getItem<any>('cities');
    const products = this.getItem<any>('products');
    
    // Add store and city names, and product details to each delivery
    return deliveries.map(delivery => {
      const store = stores.find(store => store.id === delivery.store_id);
      const city = store ? cities.find(city => city.id === store.city_id) : null;
      
      // Add product names to items
      const items = delivery.items?.map((item: any) => {
        const product = products.find(product => product.id === item.product_id);
        return {
          ...item,
          product_name: product ? product.name : 'Unknown Product'
        };
      }) || [];
      
      return {
        ...delivery,
        store_name: store ? store.name : 'Unknown Store',
        city_name: city ? city.name : 'Unknown City',
        items
      };
    });
  }

  async addStoreDelivery(deliveryData: any, items: any[]): Promise<void> {
    const deliveries = this.getItem<any>('store_deliveries');
    const newDelivery = {
      id: this.getNextId(deliveries),
      ...deliveryData,
      items,
      created_at: new Date().toISOString()
    };
    deliveries.push(newDelivery);
    this.setItem('store_deliveries', deliveries);
    
    // Update product stock
    for (const item of items) {
      const product = await this.getProductById(item.product_id);
      if (product) {
        if (product.product_type === 'single') {
          await this.updateProductStock(item.product_id, item.quantity, 'subtract');
        } else if (product.product_type === 'package') {
          // For package products, reduce stock of component products
          for (const packageItem of product.package_items || []) {
            const totalQuantity = packageItem.quantity * item.quantity;
            await this.updateProductStock(packageItem.product_id, totalQuantity, 'subtract');
          }
        }
      }
    }
  }

  async updateStoreDelivery(id: number, deliveryData: any, items: any[]): Promise<void> {
    const deliveries = this.getItem<any>('store_deliveries');
    const index = deliveries.findIndex(delivery => delivery.id === id);
    
    if (index !== -1) {
      const oldDelivery = deliveries[index];
      
      // Restore old stock first
      for (const item of oldDelivery.items || []) {
        const product = await this.getProductById(item.product_id);
        if (product) {
          if (product.product_type === 'single') {
            await this.updateProductStock(item.product_id, item.quantity, 'add');
          } else if (product.product_type === 'package') {
            // For package products, restore stock of component products
            for (const packageItem of product.package_items || []) {
              const totalQuantity = packageItem.quantity * item.quantity;
              await this.updateProductStock(packageItem.product_id, totalQuantity, 'add');
            }
          }
        }
      }
      
      // Update delivery
      deliveries[index] = {
        ...oldDelivery,
        ...deliveryData,
        items
      };
      this.setItem('store_deliveries', deliveries);
      
      // Reduce new stock
      for (const item of items) {
        const product = await this.getProductById(item.product_id);
        if (product) {
          if (product.product_type === 'single') {
            await this.updateProductStock(item.product_id, item.quantity, 'subtract');
          } else if (product.product_type === 'package') {
            // For package products, reduce stock of component products
            for (const packageItem of product.package_items || []) {
              const totalQuantity = packageItem.quantity * item.quantity;
              await this.updateProductStock(packageItem.product_id, totalQuantity, 'subtract');
            }
          }
        }
      }
    }
  }

  async deleteStoreDelivery(id: number): Promise<void> {
    const deliveries = this.getItem<any>('store_deliveries');
    const deliveryToDelete = deliveries.find(delivery => delivery.id === id);
    
    if (deliveryToDelete) {
      // Restore stock
      for (const item of deliveryToDelete.items || []) {
        const product = await this.getProductById(item.product_id);
        if (product) {
          if (product.product_type === 'single') {
            await this.updateProductStock(item.product_id, item.quantity, 'add');
          } else if (product.product_type === 'package') {
            // For package products, restore stock of component products
            for (const packageItem of product.package_items || []) {
              const totalQuantity = packageItem.quantity * item.quantity;
              await this.updateProductStock(packageItem.product_id, totalQuantity, 'add');
            }
          }
        }
      }
      
      // Remove delivery
      const filteredDeliveries = deliveries.filter(delivery => delivery.id !== id);
      this.setItem('store_deliveries', filteredDeliveries);
    }
  }

  // Individual Deliveries
  async getIndividualDeliveries(): Promise<any[]> {
    const deliveries = this.getItem<any>('individual_deliveries');
    const products = this.getItem<any>('products');
    
    // Add product names to items
    return deliveries.map(delivery => {
      const items = delivery.items?.map((item: any) => {
        const product = products.find(product => product.id === item.product_id);
        return {
          ...item,
          product_name: product ? product.name : 'Unknown Product'
        };
      }) || [];
      
      return {
        ...delivery,
        items
      };
    });
  }

  async addIndividualDelivery(deliveryData: any, items: any[]): Promise<void> {
    const deliveries = this.getItem<any>('individual_deliveries');
    const newDelivery = {
      id: this.getNextId(deliveries),
      ...deliveryData,
      city_id: deliveryData.city_id ? parseInt(deliveryData.city_id) : null,
      items,
      created_at: new Date().toISOString()
    };
    deliveries.push(newDelivery);
    this.setItem('individual_deliveries', deliveries);
    
    // Update product stock
    for (const item of items) {
      const product = await this.getProductById(item.product_id);
      if (product) {
        if (product.product_type === 'single') {
          await this.updateProductStock(item.product_id, item.quantity, 'subtract');
        } else if (product.product_type === 'package') {
          // For package products, reduce stock of component products
          for (const packageItem of product.package_items || []) {
            const totalQuantity = packageItem.quantity * item.quantity;
            await this.updateProductStock(packageItem.product_id, totalQuantity, 'subtract');
          }
        }
      }
    }
  }

  async updateIndividualDelivery(id: number, deliveryData: any, items: any[]): Promise<void> {
    const deliveries = this.getItem<any>('individual_deliveries');
    const index = deliveries.findIndex(delivery => delivery.id === id);
    
    if (index !== -1) {
      const oldDelivery = deliveries[index];
      
      // Restore old stock first
      for (const item of oldDelivery.items || []) {
        const product = await this.getProductById(item.product_id);
        if (product) {
          if (product.product_type === 'single') {
            await this.updateProductStock(item.product_id, item.quantity, 'add');
          } else if (product.product_type === 'package') {
            // For package products, restore stock of component products
            for (const packageItem of product.package_items || []) {
              const totalQuantity = packageItem.quantity * item.quantity;
              await this.updateProductStock(packageItem.product_id, totalQuantity, 'add');
            }
          }
        }
      }
      
      // Update delivery
      deliveries[index] = {
        ...oldDelivery,
        ...deliveryData,
        city_id: deliveryData.city_id ? parseInt(deliveryData.city_id) : null,
        items
      };
      this.setItem('individual_deliveries', deliveries);
      
      // Reduce new stock
      for (const item of items) {
        const product = await this.getProductById(item.product_id);
        if (product) {
          if (product.product_type === 'single') {
            await this.updateProductStock(item.product_id, item.quantity, 'subtract');
          } else if (product.product_type === 'package') {
            // For package products, reduce stock of component products
            for (const packageItem of product.package_items || []) {
              const totalQuantity = packageItem.quantity * item.quantity;
              await this.updateProductStock(packageItem.product_id, totalQuantity, 'subtract');
            }
          }
        }
      }
    }
  }

  async deleteIndividualDelivery(id: number): Promise<void> {
    const deliveries = this.getItem<any>('individual_deliveries');
    const deliveryToDelete = deliveries.find(delivery => delivery.id === id);
    
    if (deliveryToDelete) {
      // Restore stock
      for (const item of deliveryToDelete.items || []) {
        const product = await this.getProductById(item.product_id);
        if (product) {
          if (product.product_type === 'single') {
            await this.updateProductStock(item.product_id, item.quantity, 'add');
          } else if (product.product_type === 'package') {
            // For package products, restore stock of component products
            for (const packageItem of product.package_items || []) {
              const totalQuantity = packageItem.quantity * item.quantity;
              await this.updateProductStock(packageItem.product_id, totalQuantity, 'add');
            }
          }
        }
      }
      
      // Remove delivery
      const filteredDeliveries = deliveries.filter(delivery => delivery.id !== id);
      this.setItem('individual_deliveries', filteredDeliveries);
    }
  }

  // Returns
  async getReturns(): Promise<any[]> {
    const returns = this.getItem<any>('returns');
    const storeDeliveries = this.getItem<any>('store_deliveries');
    const individualDeliveries = this.getItem<any>('individual_deliveries');
    const products = this.getItem<any>('products');
    const stores = this.getItem<any>('stores');
    
    // Add delivery and product info to each return
    return returns.map(returnItem => {
      let deliveryInfo = '';
      
      if (returnItem.delivery_type === 'store') {
        const delivery = storeDeliveries.find(d => d.id === returnItem.delivery_id);
        if (delivery) {
          const store = stores.find(s => s.id === delivery.store_id);
          deliveryInfo = store ? store.name : 'Unknown Store';
        }
      } else {
        const delivery = individualDeliveries.find(d => d.id === returnItem.delivery_id);
        if (delivery) {
          deliveryInfo = delivery.customer_name;
        }
      }
      
      // Add product names to items
      const items = returnItem.items?.map((item: any) => {
        const product = products.find(product => product.id === item.product_id);
        return {
          ...item,
          product_name: product ? product.name : 'Unknown Product'
        };
      }) || [];
      
      return {
        ...returnItem,
        delivery_info: deliveryInfo,
        items
      };
    });
  }

  async addReturn(returnData: any, items: any[]): Promise<void> {
    const returns = this.getItem<any>('returns');
    const newReturn = {
      id: this.getNextId(returns),
      ...returnData,
      items,
      created_at: new Date().toISOString()
    };
    returns.push(newReturn);
    this.setItem('returns', returns);
    
    // If status is completed, update product stock
    if (returnData.status === 'completed') {
      for (const item of items) {
        const product = await this.getProductById(item.product_id);
        if (product) {
          if (product.product_type === 'single') {
            await this.updateProductStock(item.product_id, item.quantity, 'add');
          } else if (product.product_type === 'package') {
            // For package products, restore stock of component products
            for (const packageItem of product.package_items || []) {
              const totalQuantity = packageItem.quantity * item.quantity;
              await this.updateProductStock(packageItem.product_id, totalQuantity, 'add');
            }
          }
        }
      }
    }
  }

  async updateReturn(id: number, returnData: any, items: any[]): Promise<void> {
    const returns = this.getItem<any>('returns');
    const index = returns.findIndex(returnItem => returnItem.id === id);
    
    if (index !== -1) {
      const oldReturn = returns[index];
      
      // If old status was completed, reverse the stock changes
      if (oldReturn.status === 'completed') {
        for (const item of oldReturn.items || []) {
          const product = await this.getProductById(item.product_id);
          if (product) {
            if (product.product_type === 'single') {
              await this.updateProductStock(item.product_id, item.quantity, 'subtract');
            } else if (product.product_type === 'package') {
              // For package products, reduce stock of component products
              for (const packageItem of product.package_items || []) {
                const totalQuantity = packageItem.quantity * item.quantity;
                await this.updateProductStock(packageItem.product_id, totalQuantity, 'subtract');
              }
            }
          }
        }
      }
      
      // Update return
      returns[index] = {
        ...oldReturn,
        ...returnData,
        items
      };
      this.setItem('returns', returns);
      
      // If new status is completed, update product stock
      if (returnData.status === 'completed') {
        for (const item of items) {
          const product = await this.getProductById(item.product_id);
          if (product) {
            if (product.product_type === 'single') {
              await this.updateProductStock(item.product_id, item.quantity, 'add');
            } else if (product.product_type === 'package') {
              // For package products, restore stock of component products
              for (const packageItem of product.package_items || []) {
                const totalQuantity = packageItem.quantity * item.quantity;
                await this.updateProductStock(packageItem.product_id, totalQuantity, 'add');
              }
            }
          }
        }
      }
    }
  }

  async deleteReturn(id: number): Promise<void> {
    const returns = this.getItem<any>('returns');
    const returnToDelete = returns.find(returnItem => returnItem.id === id);
    
    if (returnToDelete) {
      // If status was completed, reverse the stock changes
      if (returnToDelete.status === 'completed') {
        for (const item of returnToDelete.items || []) {
          const product = await this.getProductById(item.product_id);
          if (product) {
            if (product.product_type === 'single') {
              await this.updateProductStock(item.product_id, item.quantity, 'subtract');
            } else if (product.product_type === 'package') {
              // For package products, reduce stock of component products
              for (const packageItem of product.package_items || []) {
                const totalQuantity = packageItem.quantity * item.quantity;
                await this.updateProductStock(packageItem.product_id, totalQuantity, 'subtract');
              }
            }
          }
        }
      }
      
      // Remove return
      const filteredReturns = returns.filter(returnItem => returnItem.id !== id);
      this.setItem('returns', filteredReturns);
    }
  }

  // Employees
  async getEmployees(): Promise<any[]> {
    return this.getItem<any>('employees');
  }

  async addEmployee(
    name: string,
    position: string,
    baseSalary: number,
    baseOvertime: number,
    contact: string,
    address: string,
    hireDate: string,
    birthDate: string
  ): Promise<void> {
    const employees = this.getItem<any>('employees');
    const newEmployee = {
      id: this.getNextId(employees),
      name,
      position,
      base_salary: baseSalary,
      base_overtime: baseOvertime,
      contact,
      address,
      hire_date: hireDate,
      birth_date: birthDate,
      status: 'active',
      created_at: new Date().toISOString()
    };
    employees.push(newEmployee);
    this.setItem('employees', employees);
  }

  async updateEmployee(
    id: number,
    name: string,
    position: string,
    baseSalary: number,
    baseOvertime: number,
    contact: string,
    address: string,
    hireDate: string,
    birthDate: string,
    status: string
  ): Promise<void> {
    const employees = this.getItem<any>('employees');
    const index = employees.findIndex(employee => employee.id === id);
    if (index !== -1) {
      employees[index] = {
        ...employees[index],
        name,
        position,
        base_salary: baseSalary,
        base_overtime: baseOvertime,
        contact,
        address,
        hire_date: hireDate,
        birth_date: birthDate,
        status
      };
      this.setItem('employees', employees);
    }
  }

  async deleteEmployee(id: number): Promise<void> {
    const employees = this.getItem<any>('employees');
    const filteredEmployees = employees.filter(employee => employee.id !== id);
    this.setItem('employees', filteredEmployees);
  }

  async getUpcomingBirthdays(): Promise<any[]> {
    const employees = this.getItem<any>('employees');
    const today = new Date();
    
    // Filter employees with birthdays in the next 7 days
    return employees.filter(employee => {
      if (!employee.birth_date) return false;
      
      const birthDate = new Date(employee.birth_date);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      
      // If birthday has passed this year, use next year's birthday
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      
      // Calculate days until birthday
      const diffTime = thisYearBirthday.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= 7;
    });
  }

  // Payroll
  async getPayrolls(): Promise<any[]> {
    const payrolls = this.getItem<any>('payrolls');
    const employees = this.getItem<any>('employees');
    
    // Add employee names to payrolls
    return payrolls.map(payroll => {
      const employee = employees.find(emp => emp.id === payroll.employee_id);
      return {
        ...payroll,
        employee_name: employee ? employee.name : 'Unknown Employee',
        employee_position: employee ? employee.position : 'Unknown Position'
      };
    });
  }

  async addPayroll(payrollData: any): Promise<void> {
    const payrolls = this.getItem<any>('payrolls');
    const newPayroll = {
      id: this.getNextId(payrolls),
      ...payrollData,
      created_at: new Date().toISOString()
    };
    payrolls.push(newPayroll);
    this.setItem('payrolls', payrolls);
  }

  async updatePayroll(id: number, payrollData: any): Promise<void> {
    const payrolls = this.getItem<any>('payrolls');
    const index = payrolls.findIndex(payroll => payroll.id === id);
    if (index !== -1) {
      payrolls[index] = {
        ...payrolls[index],
        ...payrollData
      };
      this.setItem('payrolls', payrolls);
    }
  }

  async deletePayroll(id: number): Promise<void> {
    const payrolls = this.getItem<any>('payrolls');
    const filteredPayrolls = payrolls.filter(payroll => payroll.id !== id);
    this.setItem('payrolls', filteredPayrolls);
  }

  // Raw Materials
  async getRawMaterials(): Promise<any[]> {
    return this.getItem<any>('raw_materials');
  }

  async addRawMaterial(
    name: string,
    category: string,
    unit: string,
    stockQuantity: number,
    unitCost: number,
    supplier: string,
    minimumStock: number,
    expiryDate: string
  ): Promise<void> {
    const materials = this.getItem<any>('raw_materials');
    const newMaterial = {
      id: this.getNextId(materials),
      name,
      category,
      unit,
      stock_quantity: stockQuantity,
      unit_cost: unitCost,
      supplier,
      minimum_stock: minimumStock,
      expiry_date: expiryDate,
      created_at: new Date().toISOString()
    };
    materials.push(newMaterial);
    this.setItem('raw_materials', materials);
  }

  async updateRawMaterial(
    id: number,
    name: string,
    category: string,
    unit: string,
    stockQuantity: number,
    unitCost: number,
    supplier: string,
    minimumStock: number,
    expiryDate: string
  ): Promise<void> {
    const materials = this.getItem<any>('raw_materials');
    const index = materials.findIndex(material => material.id === id);
    if (index !== -1) {
      materials[index] = {
        ...materials[index],
        name,
        category,
        unit,
        stock_quantity: stockQuantity,
        unit_cost: unitCost,
        supplier,
        minimum_stock: minimumStock,
        expiry_date: expiryDate
      };
      this.setItem('raw_materials', materials);
    }
  }

  async deleteRawMaterial(id: number): Promise<void> {
    const materials = this.getItem<any>('raw_materials');
    const filteredMaterials = materials.filter(material => material.id !== id);
    this.setItem('raw_materials', filteredMaterials);
  }

  // Factory Production
  async getFactoryProductions(): Promise<any[]> {
    const productions = this.getItem<any>('factory_productions');
    const employees = this.getItem<any>('employees');
    const products = this.getItem<any>('products');
    
    // Add employee and product names
    return productions.map(production => {
      const employee = employees.find(emp => emp.id === production.employee_id);
      const product = products.find(prod => prod.id === production.product_id);
      
      return {
        ...production,
        employee_name: employee ? employee.name : 'Unknown Employee',
        product_name: product ? product.name : 'Unknown Product'
      };
    });
  }

  async addFactoryProduction(productionData: any, materials: any[]): Promise<void> {
    const productions = this.getItem<any>('factory_productions');
    const newProduction = {
      id: this.getNextId(productions),
      ...productionData,
      materials,
      created_at: new Date().toISOString()
    };
    productions.push(newProduction);
    this.setItem('factory_productions', productions);
    
    // Update product stock
    await this.updateProductStock(productionData.product_id, productionData.quantity_produced, 'add');
    
    // Update raw material stock
    for (const material of materials) {
      await this.updateRawMaterialStock(material.raw_material_id, material.quantity_used, 'subtract');
    }
  }

  async updateFactoryProduction(id: number, productionData: any, materials: any[]): Promise<void> {
    const productions = this.getItem<any>('factory_productions');
    const index = productions.findIndex(production => production.id === id);
    
    if (index !== -1) {
      const oldProduction = productions[index];
      
      // Reverse old stock changes
      await this.updateProductStock(oldProduction.product_id, oldProduction.quantity_produced, 'subtract');
      
      for (const material of oldProduction.materials || []) {
        await this.updateRawMaterialStock(material.raw_material_id, material.quantity_used, 'add');
      }
      
      // Update production
      productions[index] = {
        ...oldProduction,
        ...productionData,
        materials
      };
      this.setItem('factory_productions', productions);
      
      // Apply new stock changes
      await this.updateProductStock(productionData.product_id, productionData.quantity_produced, 'add');
      
      for (const material of materials) {
        await this.updateRawMaterialStock(material.raw_material_id, material.quantity_used, 'subtract');
      }
    }
  }

  async deleteFactoryProduction(id: number): Promise<void> {
    const productions = this.getItem<any>('factory_productions');
    const productionToDelete = productions.find(production => production.id === id);
    
    if (productionToDelete) {
      // Reverse stock changes
      await this.updateProductStock(productionToDelete.product_id, productionToDelete.quantity_produced, 'subtract');
      
      for (const material of productionToDelete.materials || []) {
        await this.updateRawMaterialStock(material.raw_material_id, material.quantity_used, 'add');
      }
      
      // Remove production
      const filteredProductions = productions.filter(production => production.id !== id);
      this.setItem('factory_productions', filteredProductions);
    }
  }

  async updateRawMaterialStock(materialId: number, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    const materials = this.getItem<any>('raw_materials');
    const index = materials.findIndex(material => material.id === materialId);
    
    if (index !== -1) {
      const material = materials[index];
      
      if (operation === 'add') {
        material.stock_quantity += amount;
      } else {
        material.stock_quantity = Math.max(0, material.stock_quantity - amount);
      }
      
      this.setItem('raw_materials', materials);
    }
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<any> {
    const storeDeliveries = await this.getStoreDeliveries();
    const individualDeliveries = await this.getIndividualDeliveries();
    const returns = await this.getReturns();
    const products = await this.getProducts();
    
    const totalDeliveries = storeDeliveries.length + individualDeliveries.length;
    
    const totalRevenue = storeDeliveries.reduce((sum, delivery) => 
      delivery.status === 'completed' ? sum + delivery.total_amount : sum, 0
    ) + individualDeliveries.reduce((sum, delivery) => 
      delivery.status === 'completed' ? sum + delivery.total_amount : sum, 0
    );
    
    const pendingDeliveries = storeDeliveries.filter(delivery => 
      delivery.status === 'pending'
    ).length + individualDeliveries.filter(delivery => 
      delivery.status === 'pending'
    ).length;
    
    const completedDeliveries = storeDeliveries.filter(delivery => 
      delivery.status === 'completed'
    ).length + individualDeliveries.filter(delivery => 
      delivery.status === 'completed'
    ).length;
    
    const totalReturns = returns.length;
    
    const lowStockProducts = products.filter(product => 
      product.product_type === 'single' && 
      product.stock > 0 && 
      product.stock <= product.minimum_stock
    ).length;
    
    return {
      total_deliveries: totalDeliveries,
      total_revenue: totalRevenue,
      pending_deliveries: pendingDeliveries,
      completed_deliveries: completedDeliveries,
      total_returns: totalReturns,
      low_stock_products: lowStockProducts
    };
  }

  // Bookkeeping
  async getBookkeepingEntries(): Promise<any[]> {
    return this.getItem<any>('bookkeeping_entries');
  }

  async addBookkeepingEntry(
    date: string,
    type: string,
    category: string,
    description: string,
    amount: number
  ): Promise<void> {
    const entries = this.getItem<any>('bookkeeping_entries');
    const newEntry = {
      id: this.getNextId(entries),
      date,
      type,
      category,
      description,
      amount,
      is_auto: false,
      created_at: new Date().toISOString()
    };
    entries.push(newEntry);
    this.setItem('bookkeeping_entries', entries);
  }

  async updateBookkeepingEntry(id: number, entryData: any): Promise<void> {
    const entries = this.getItem<any>('bookkeeping_entries');
    const index = entries.findIndex(entry => entry.id === id);
    if (index !== -1) {
      entries[index] = {
        ...entries[index],
        ...entryData
      };
      this.setItem('bookkeeping_entries', entries);
    }
  }

  async deleteBookkeepingEntry(id: number): Promise<void> {
    const entries = this.getItem<any>('bookkeeping_entries');
    const filteredEntries = entries.filter(entry => entry.id !== id);
    this.setItem('bookkeeping_entries', filteredEntries);
  }

  async getBookkeepingSummary(): Promise<any> {
    const entries = this.getItem<any>('bookkeeping_entries');
    
    const summary = {
      total_income: 0,
      total_expense: 0,
      net_profit: 0,
      primer: { income: 0, expense: 0 },
      sekunder: { income: 0, expense: 0 },
      tersier: { income: 0, expense: 0 }
    };

    entries.forEach((entry: any) => {
      if (entry.type === 'income') {
        summary.total_income += entry.amount;
        summary[entry.category as keyof typeof summary].income += entry.amount;
      } else {
        summary.total_expense += entry.amount;
        summary[entry.category as keyof typeof summary].expense += entry.amount;
      }
    });

    summary.net_profit = summary.total_income - summary.total_expense;
    return summary;
  }

  async getBookkeepingReport(startDate: string, endDate: string): Promise<any> {
    const entries = this.getItem<any>('bookkeeping_entries');
    
    // Filter entries by date range
    const filteredEntries = entries.filter((entry: any) => {
      const entryDate = new Date(entry.date);
      return entryDate >= new Date(startDate) && entryDate <= new Date(endDate);
    });
    
    // Calculate totals
    const totalIncome = filteredEntries.reduce((sum: number, entry: any) => 
      entry.type === 'income' ? sum + entry.amount : sum, 0
    );
    
    const totalExpense = filteredEntries.reduce((sum: number, entry: any) => 
      entry.type === 'expense' ? sum + entry.amount : sum, 0
    );
    
    const netProfit = totalIncome - totalExpense;
    
    return {
      entries: filteredEntries,
      total_income: totalIncome,
      total_expense: totalExpense,
      net_profit: netProfit
    };
  }

  // Assets
  async getAssets(): Promise<any[]> {
    return this.getItem<any>('assets');
  }

  async addAsset(assetData: any): Promise<void> {
    const assets = this.getItem<any>('assets');
    const newAsset = {
      id: this.getNextId(assets),
      ...assetData,
      created_at: new Date().toISOString()
    };
    assets.push(newAsset);
    this.setItem('assets', assets);
  }

  async updateAsset(id: number, assetData: any): Promise<void> {
    const assets = this.getItem<any>('assets');
    const index = assets.findIndex(asset => asset.id === id);
    if (index !== -1) {
      assets[index] = {
        ...assets[index],
        ...assetData
      };
      this.setItem('assets', assets);
    }
  }

  async deleteAsset(id: number): Promise<void> {
    const assets = this.getItem<any>('assets');
    const filteredAssets = assets.filter(asset => asset.id !== id);
    this.setItem('assets', filteredAssets);
  }

  // Recipe Management
  async getRecipes(): Promise<any[]> {
    const recipes = this.getItem<any>('recipes');
    const products = this.getItem<any>('products');
    const materials = this.getItem<any>('raw_materials');
    
    // Add product and material names
    return recipes.map(recipe => {
      const product = products.find(p => p.id === recipe.product_id);
      const material = materials.find(m => m.id === recipe.raw_material_id);
      
      return {
        ...recipe,
        product_name: product ? product.name : 'Unknown Product',
        material_name: material ? material.name : 'Unknown Material',
        material_unit: material ? material.unit : 'Unknown Unit'
      };
    });
  }

  async getProductRecipes(productId: number): Promise<any[]> {
    const recipes = this.getItem<any>('recipes');
    const materials = this.getItem<any>('raw_materials');
    
    // Filter recipes for the specific product and add material details
    return recipes
      .filter(recipe => recipe.product_id === productId)
      .map(recipe => {
        const material = materials.find(m => m.id === recipe.raw_material_id);
        
        if (!material) {
          return {
            ...recipe,
            material_name: 'Unknown Material',
            material_unit: 'Unknown Unit',
            material_cost: 0,
            total_cost: 0,
            stock_available: 0,
            original_unit: 'Unknown Unit'
          };
        }
        
        // Calculate cost per smallest unit
        const totalCost = (material.unit_cost * recipe.quantity_needed);
        
        return {
          ...recipe,
          material_name: material.name,
          material_unit: material.unit,
          material_cost: material.unit_cost,
          total_cost: totalCost,
          stock_available: material.stock_quantity,
          original_unit: material.unit
        };
      });
  }

  async addRecipe(productId: number, materialId: number, quantityNeeded: number): Promise<void> {
    const recipes = this.getItem<any>('recipes');
    
    // Check if recipe already exists
    const existingRecipe = recipes.find(recipe => 
      recipe.product_id === productId && recipe.raw_material_id === materialId
    );
    
    if (existingRecipe) {
      // Update existing recipe
      existingRecipe.quantity_needed = quantityNeeded;
      this.setItem('recipes', recipes);
    } else {
      // Add new recipe
      const newRecipe = {
        id: this.getNextId(recipes),
        product_id: productId,
        raw_material_id: materialId,
        quantity_needed: quantityNeeded,
        created_at: new Date().toISOString()
      };
      recipes.push(newRecipe);
      this.setItem('recipes', recipes);
    }
  }

  async deleteRecipe(id: number): Promise<void> {
    const recipes = this.getItem<any>('recipes');
    const filteredRecipes = recipes.filter(recipe => recipe.id !== id);
    this.setItem('recipes', filteredRecipes);
  }

  async saveProductRecipe(productId: number, recipeItems: any[]): Promise<void> {
    const recipes = this.getItem<any>('recipes');
    
    // Remove existing recipes for this product
    const filteredRecipes = recipes.filter(recipe => recipe.product_id !== productId);
    
    // Add new recipes
    const newRecipes = recipeItems.map((item, index) => ({
      id: this.getNextId(filteredRecipes) + index,
      product_id: productId,
      raw_material_id: item.raw_material_id,
      quantity_needed: item.recipe_quantity,
      created_at: new Date().toISOString()
    }));
    
    this.setItem('recipes', [...filteredRecipes, ...newRecipes]);
  }

  // HPP (Harga Pokok Produksi)
  async getHPPs(): Promise<any[]> {
    const hpps = this.getItem<any>('hpp');
    const products = this.getItem<any>('products');
    
    // Add product names
    return hpps.map(hpp => {
      const product = products.find(p => p.id === hpp.product_id);
      return {
        ...hpp,
        product_name: product ? product.name : 'Unknown Product'
      };
    });
  }

  async calculateHPP(
    productId: number,
    overheadCost: number,
    targetProfitPercentage: number,
    taxPercentage: number
  ): Promise<any> {
    const recipes = await this.getProductRecipes(productId);
    
    // Calculate material cost
    const materialCost = recipes.reduce((sum, recipe) => sum + recipe.total_cost, 0);
    
    // Calculate total cost
    const totalCost = materialCost + overheadCost;
    
    // Calculate minimum selling price (just covering costs)
    const minimumSellingPrice = totalCost;
    
    // Calculate suggested selling price with target profit
    const suggestedSellingPrice = totalCost * (1 + targetProfitPercentage / 100);
    
    // Calculate final selling price with tax
    const finalSellingPrice = suggestedSellingPrice * (1 + taxPercentage / 100);
    
    return {
      material_cost: materialCost,
      total_cost: totalCost,
      minimum_selling_price: minimumSellingPrice,
      suggested_selling_price: suggestedSellingPrice,
      final_selling_price: finalSellingPrice
    };
  }

  async addHPP(hppData: any): Promise<void> {
    const hpps = this.getItem<any>('hpp');
    
    // Check if HPP already exists for this product
    const existingIndex = hpps.findIndex(hpp => hpp.product_id === hppData.product_id);
    
    if (existingIndex !== -1) {
      // Update existing HPP
      hpps[existingIndex] = {
        ...hpps[existingIndex],
        ...hppData,
        updated_at: new Date().toISOString()
      };
    } else {
      // Add new HPP
      const newHPP = {
        id: this.getNextId(hpps),
        ...hppData,
        created_at: new Date().toISOString()
      };
      hpps.push(newHPP);
    }
    
    this.setItem('hpp', hpps);
  }

  async updateHPP(id: number, hppData: any): Promise<void> {
    const hpps = this.getItem<any>('hpp');
    const index = hpps.findIndex(hpp => hpp.id === id);
    
    if (index !== -1) {
      hpps[index] = {
        ...hpps[index],
        ...hppData,
        updated_at: new Date().toISOString()
      };
      this.setItem('hpp', hpps);
    }
  }

  async deleteHPP(id: number): Promise<void> {
    const hpps = this.getItem<any>('hpp');
    const filteredHPPs = hpps.filter(hpp => hpp.id !== id);
    this.setItem('hpp', filteredHPPs);
  }

  // Helper methods
  async getProductById(id: number): Promise<any> {
    const products = this.getItem<any>('products');
    return products.find(product => product.id === id);
  }

  // Backup and Restore
  downloadBackup(): boolean {
    try {
      const backup: any = {};
      
      // Get all data
      const keys = [
        'cities',
        'price_areas',
        'stores',
        'products',
        'store_deliveries',
        'individual_deliveries',
        'returns',
        'employees',
        'payrolls',
        'raw_materials',
        'factory_productions',
        'stock_reductions',
        'recipes',
        'hpp',
        'assets',
        'admin_settings',
        'bookkeeping_entries'
      ];
      
      keys.forEach(key => {
        backup[key] = this.getItem(key);
      });
      
      // Add metadata
      backup.metadata = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        description: 'Risna Cookies Inventory System Backup'
      };
      
      // Create and download file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `risna_cookies_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }

  async uploadBackup(file: File): Promise<boolean> {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            const backup = JSON.parse(event.target?.result as string);
            
            // Validate backup
            if (!backup.metadata || !backup.metadata.version) {
              reject(new Error('Invalid backup file'));
              return;
            }
            
            // Restore data
            const keys = [
              'cities',
              'price_areas',
              'stores',
              'products',
              'store_deliveries',
              'individual_deliveries',
              'returns',
              'employees',
              'payrolls',
              'raw_materials',
              'factory_productions',
              'stock_reductions',
              'recipes',
              'hpp',
              'assets',
              'admin_settings',
              'bookkeeping_entries'
            ];
            
            keys.forEach(key => {
              if (backup[key]) {
                this.storage.setItem(`${this.prefix}${key}`, JSON.stringify(backup[key]));
              }
            });
            
            resolve(true);
          } catch (error) {
            reject(error);
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Error reading file'));
        };
        
        reader.readAsText(file);
      });
    } catch (error) {
      console.error('Error restoring backup:', error);
      return false;
    }
  }
}

export const db = new Database();