'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ManageMenu() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'main',
    price: '',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    spiceLevel: 'none',
    preparationTime: 15,
    image: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== 'restaurant') {
      router.push('/dashboard');
      return;
    }

    fetchRestaurantAndMenu(parsedUser);
  }, [router]);

  const fetchRestaurantAndMenu = async (userData) => {
    try {
      // Fetch restaurant details
      const restResponse = await fetch('/api/restaurants');
      const restData = await restResponse.json();
      
      if (restData.success) {
        const myRestaurant = restData.data.find(r => r.tenantId === userData.tenantId);
        if (myRestaurant) {
          setRestaurant(myRestaurant);
          
          // Fetch menu items
          const menuResponse = await fetch(`/api/restaurants/${myRestaurant._id}/menu`);
          const menuData = await menuResponse.json();
          
          if (menuData.success) {
            setMenuItems(menuData.data);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({ ...prev, image: data.filename }));
      } else {
        alert(data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!restaurant) return;

    try {
      const url = editingItem 
        ? `/api/menu/${editingItem._id}`
        : `/api/restaurants/${restaurant._id}/menu`;
      
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          preparationTime: parseInt(formData.preparationTime),
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(editingItem ? 'Menu item updated successfully!' : 'Menu item added successfully!');
        
        if (editingItem) {
          // Update existing item in list
          setMenuItems(menuItems.map(item => 
            item._id === editingItem._id ? data.data : item
          ));
          setEditingItem(null);
        } else {
          // Add new item to list
          setMenuItems([...menuItems, data.data]);
        }
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          category: 'main',
          price: '',
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: false,
          spiceLevel: 'none',
          preparationTime: 15,
          image: '',
        });
        setShowAddForm(false);
      } else {
        alert(data.message || 'Failed to save menu item');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save menu item. Please try again.');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      price: item.price.toString(),
      isVegetarian: item.isVegetarian || false,
      isVegan: item.isVegan || false,
      isGlutenFree: item.isGlutenFree || false,
      spiceLevel: item.spiceLevel || 'none',
      preparationTime: item.preparationTime || 15,
      image: item.image || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Menu item deleted successfully!');
        setMenuItems(menuItems.filter(item => item._id !== itemId));
      } else {
        alert(data.message || 'Failed to delete menu item');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete menu item. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setShowAddForm(false);
    setFormData({
      name: '',
      description: '',
      category: 'main',
      price: '',
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      spiceLevel: 'none',
      preparationTime: 15,
      image: '',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Restaurant not found</h2>
          <p className="text-gray-600 mb-4">Please register your restaurant first</p>
          <Link href="/dashboard" className="text-orange-600 hover:text-orange-500">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      {/* Restaurant Header */}
      <div className="bg-white border-b border-gray-200">
        {/* Cover Image */}
        {restaurant.coverImage && (
          <div className="h-64 overflow-hidden relative">
            <img 
              src={`/uploads/${restaurant.coverImage}`} 
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
          </div>
        )}
        
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className={`w-32 h-32 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border-4 border-white shadow-lg ${restaurant.coverImage ? '-mt-16' : ''} relative z-10`}>
              {restaurant.logo ? (
                <img 
                  src={`/uploads/${restaurant.logo}`} 
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-16 h-16 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              )}
            </div>

            {/* Restaurant Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
                  <p className="text-gray-600 text-lg mb-4">{restaurant.description}</p>
                  
                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-semibold text-gray-900">{restaurant.rating.toFixed(1)}</span>
                      <span className="text-gray-500">({restaurant.totalReviews} reviews)</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{restaurant.estimatedDeliveryTime} min delivery</span>
                    </div>
                  </div>

                  {restaurant.cuisine && restaurant.cuisine.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {restaurant.cuisine.map((c, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-orange-100 border border-orange-200 rounded-full text-sm text-orange-700 font-medium"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Menu Item Button */}
                <button
                  onClick={() => {
                    if (editingItem) {
                      handleCancelEdit();
                    } else {
                      setShowAddForm(!showAddForm);
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  {showAddForm ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Menu Item
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{menuItems.length}</p>
                <p className="text-sm text-gray-600">Menu Items</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{menuItems.filter(i => i.isVegetarian).length}</p>
                <p className="text-sm text-gray-600">Vegetarian</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {menuItems.length > 0 ? new Set(menuItems.map(i => i.category)).size : 0}
                </p>
                <p className="text-sm text-gray-600">Categories</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="text-sm font-semibold text-gray-900">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">

        {/* Add/Edit Menu Item Form */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
              {/* Dialog Header */}
              <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white">
                    {editingItem ? '✏️ Edit Menu Item' : '✨ Add New Menu Item'}
                  </h2>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Dialog Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Item Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 transition-all"
                      placeholder="e.g., Margherita Pizza"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 resize-none transition-all"
                      placeholder="Describe your delicious dish..."
                    />
                  </div>

                  {/* Category and Price */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 transition-all"
                      >
                        <option value="appetizer">🥗 Appetizer</option>
                        <option value="main">🍽️ Main Course</option>
                        <option value="dessert">🍰 Dessert</option>
                        <option value="beverage">☕ Beverage</option>
                        <option value="side">🍟 Side Dish</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Price ($) *
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        required
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 transition-all"
                        placeholder="9.99"
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Menu Item Image
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50/50 transition-all">
                          <svg className="w-8 h-8 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="text-center">
                            <span className="text-sm font-medium text-gray-700">
                              {uploadingImage ? '⏳ Uploading...' : formData.image ? '✅ Change Image' : '📸 Upload Image'}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                          </div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                      {formData.image && (
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden border-4 border-green-500 shadow-lg flex-shrink-0">
                          <img src={`/uploads/${formData.image}`} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, image: '' })}
                            className="absolute top-1 right-1 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preparation Time and Spice Level */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Preparation Time (minutes)
                      </label>
                      <input
                        type="number"
                        name="preparationTime"
                        value={formData.preparationTime}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 transition-all"
                        placeholder="15"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Spice Level
                      </label>
                      <select
                        name="spiceLevel"
                        value={formData.spiceLevel}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 transition-all"
                      >
                        <option value="none">🟢 None</option>
                        <option value="mild">🟡 Mild</option>
                        <option value="medium">🟠 Medium</option>
                        <option value="hot">🔴 Hot</option>
                      </select>
                    </div>
                  </div>

                  {/* Dietary Preferences */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Dietary Options
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center cursor-pointer bg-gray-50 hover:bg-green-50 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-green-300 transition-all">
                        <input
                          type="checkbox"
                          name="isVegetarian"
                          checked={formData.isVegetarian}
                          onChange={handleChange}
                          className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🌱 Vegetarian</span>
                      </label>

                      <label className="flex items-center cursor-pointer bg-gray-50 hover:bg-green-50 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-green-300 transition-all">
                        <input
                          type="checkbox"
                          name="isVegan"
                          checked={formData.isVegan}
                          onChange={handleChange}
                          className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🥬 Vegan</span>
                      </label>

                      <label className="flex items-center cursor-pointer bg-gray-50 hover:bg-green-50 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-green-300 transition-all">
                        <input
                          type="checkbox"
                          name="isGlutenFree"
                          checked={formData.isGlutenFree}
                          onChange={handleChange}
                          className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">🌾 Gluten Free</span>
                      </label>
                    </div>
                  </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all transform hover:scale-[1.02]"
                  >
                    {editingItem ? '💾 Update Item' : '✨ Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}        {/* Menu Items Grid */}
        {menuItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-16 h-16 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Menu Items Yet</h3>
            <p className="text-gray-600 mb-6">Start building your menu by adding your first delicious item!</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all transform hover:scale-105"
            >
              ✨ Add Your First Item
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                All Menu Items
                <span className="ml-3 text-lg font-normal text-gray-500">({menuItems.length} items)</span>
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-orange-300 hover:shadow-2xl transition-all duration-300 group"
                >
                  {/* Item Image */}
                  <div className="h-56 bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center overflow-hidden relative">
                    {item.image ? (
                      <>
                        <img 
                          src={`/uploads/${item.image}`} 
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML += '<svg class="w-20 h-20 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>';
                          }}
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                          <span className="text-xs font-semibold text-orange-600 uppercase">{item.category}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <svg className="w-20 h-20 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                          <span className="text-xs font-semibold text-orange-600 uppercase">{item.category}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold text-gray-900 flex-1 pr-2">{item.name}</h3>
                      {item.isVegetarian && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full border border-green-300 font-semibold flex-shrink-0">
                          🌱 Veg
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                      {item.description || 'Delicious dish prepared with fresh ingredients'}
                    </p>

                    {/* Dietary Tags */}
                    {(item.isVegan || item.isGlutenFree || item.spiceLevel) && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.isVegan && (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full border border-emerald-200 font-medium">
                            🥬 Vegan
                          </span>
                        )}
                        {item.isGlutenFree && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200 font-medium">
                            🌾 GF
                          </span>
                        )}
                        {item.spiceLevel && item.spiceLevel !== 'none' && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full border border-red-200 font-medium">
                            🌶️ {item.spiceLevel}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price and Prep Time */}
                    <div className="flex items-center justify-between mb-4 pt-4 border-t border-gray-200">
                      <div className="text-3xl font-bold text-orange-600">
                        ${item.price.toFixed(2)}
                      </div>
                      {item.preparationTime && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm">{item.preparationTime} min</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-semibold rounded-xl transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm font-semibold rounded-xl transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
