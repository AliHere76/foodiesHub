import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import MenuItem from '@/models/MenuItem';
import Restaurant from '@/models/Restaurant';
import { cacheHelper } from '@/lib/redis';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// Get single menu item
export async function GET(request, { params }) {
  try {
    await connectDB();

    const menuItem = await MenuItem.findById(params.itemId);
    
    if (!menuItem) {
      return NextResponse.json(
        { success: false, message: 'Menu item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    console.error('Get menu item error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update menu item
export async function PUT(request, { params }) {
  try {
    // Verify authentication
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'restaurant') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Restaurant owners only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      price,
      image,
      isVegetarian,
      isVegan,
      isGlutenFree,
      spiceLevel,
      preparationTime,
      ingredients,
      allergens,
      isAvailable,
    } = body;

    await connectDB();

    // Get existing menu item
    const existingItem = await MenuItem.findById(params.itemId);
    
    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Verify tenant ownership
    if (existingItem.tenantId.toString() !== decoded.tenantId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Not your menu item' },
        { status: 403 }
      );
    }

    // Update menu item
    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(category && { category: category.toLowerCase() }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(image !== undefined && { image }),
      ...(isVegetarian !== undefined && { isVegetarian }),
      ...(isVegan !== undefined && { isVegan }),
      ...(isGlutenFree !== undefined && { isGlutenFree }),
      ...(spiceLevel !== undefined && { spiceLevel: spiceLevel ? spiceLevel.toLowerCase() : 'none' }),
      ...(preparationTime !== undefined && { preparationTime }),
      ...(ingredients !== undefined && { ingredients }),
      ...(allergens !== undefined && { allergens }),
      ...(isAvailable !== undefined && { isAvailable }),
    };

    const updatedItem = await MenuItem.findByIdAndUpdate(
      params.itemId,
      updateData,
      { new: true, runValidators: true }
    );

    // Invalidate cache
    await cacheHelper.delete(`menu:all`, existingItem.tenantId.toString());
    await cacheHelper.delete(`menu:${existingItem.category}`, existingItem.tenantId.toString());
    if (category && category !== existingItem.category) {
      await cacheHelper.delete(`menu:${category}`, existingItem.tenantId.toString());
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Menu item updated successfully',
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

// Delete menu item
export async function DELETE(request, { params }) {
  try {
    // Verify authentication
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'restaurant') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Restaurant owners only' },
        { status: 403 }
      );
    }

    await connectDB();

    // Get existing menu item
    const existingItem = await MenuItem.findById(params.itemId);
    
    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: 'Menu item not found' },
        { status: 404 }
      );
    }

    // Verify tenant ownership
    if (existingItem.tenantId.toString() !== decoded.tenantId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Not your menu item' },
        { status: 403 }
      );
    }

    // Delete menu item
    await MenuItem.findByIdAndDelete(params.itemId);

    // Invalidate cache
    await cacheHelper.delete(`menu:all`, existingItem.tenantId.toString());
    await cacheHelper.delete(`menu:${existingItem.category}`, existingItem.tenantId.toString());

    return NextResponse.json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
