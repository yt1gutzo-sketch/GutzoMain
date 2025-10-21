
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
const app = new Hono();
// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(Deno.env.get('PRIVATE_SUPABASE_URL'), Deno.env.get('PRIVATE_SUPABASE_SERVICE_ROLE_KEY'));


console.log('Gutzo Marketplace Server starting...:', Deno.env.get('PRIVATE_SUPABASE_URL'));
console.log('Gutzo Marketplace Server starting...', Deno.env.get('PRIVATE_SUPABASE_SERVICE_ROLE_KEY'));
// Check database schema on startup

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema...');
    // Check users table
    const { data: usersData, error: usersError } = await supabase.from('users').select('id').limit(1);
    if (usersError?.message?.includes('relation "users" does not exist')) {
      console.log('⚠️  users table does not exist');
      console.log('📋 Manual table creation required in Supabase Dashboard');
      console.log('🔗 Visit: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql');
      console.log('💡 Run the migration: /supabase/migrations/create_users_table.sql');
    } else if (usersError) {
      console.error('❌ Error checking users table:', usersError.message);
    } else {
      console.log('✅ users table exists and is ready');
      // Count existing users
      const { count: userCount } = await supabase.from('users').select('*', {
        count: 'exact',
        head: true
      });
      console.log(`👥 Found ${userCount || 0} users in database`);
    }
    // Skip otp_verification table check for now
    console.log('ℹ️  Skipping otp_verification table check');
    // Check product_subscriptions table
    const { data, error } = await supabase.from('product_subscriptions').select('id').limit(1);
    if (error?.message?.includes('relation "product_subscriptions" does not exist')) {
      console.log('⚠️  product_subscriptions table does not exist');
      console.log('💡 Run the migration: /supabase/migrations/create_product_subscriptions_table.sql');
    } else if (error) {
      console.error('❌ Error checking product_subscriptions table:', error.message);
    } else {
      console.log('✅ product_subscriptions table exists and is ready');
      // Count existing subscription records
      const { count } = await supabase.from('product_subscriptions').select('*', {
        count: 'exact',
        head: true
      });
      console.log(`📊 Found ${count || 0} subscription records in database`);
    }
  } catch (error) {
    console.error('❌ Database schema check error:', error);
  }
}



const PHONEPE_MERCHANT_ID = Deno.env.get('PHONEPE_MERCHANT_ID');
const PHONEPE_SALT_KEY = Deno.env.get('PHONEPE_SALT_KEY');
const PHONEPE_CLIENT_VERSION = Deno.env.get('PHONEPE_CLIENT_VERSION');
// Use UAT (sandbox) endpoint for test mode as per PhonePe docs
const PHONEPE_BASE_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox';

// Create PhonePe Payment
app.post('/gutzo-api/create-phonepe-payment', async (c) => {
  const body = await c.req.json();
  const { amount, orderId, customerId, redirectUrl } = body;
  // Validate required fields
  if (!amount || !orderId || !customerId || !redirectUrl) {
    console.error('Missing required payment fields:', { amount, orderId, customerId, redirectUrl });
    return c.json({ success: false, error: 'Missing required payment fields', details: { amount, orderId, customerId, redirectUrl } }, 400);
  }
  // Warn if redirectUrl is localhost (not allowed in UAT/production)
  if (redirectUrl.includes('localhost') || redirectUrl.includes('127.0.0.1')) {
    console.warn('⚠️ PhonePe redirectUrl is localhost. Use a public URL for UAT/production.');
  }
  // Prepare payload as per PhonePe UAT docs
  const payload = {
    merchantId: PHONEPE_MERCHANT_ID,
    merchantTransactionId: orderId,
    merchantUserId: customerId,
    amount: amount * 100, // in paise
    redirectUrl,
    redirectMode: 'POST',
    callbackUrl: redirectUrl, // You may want to set a real webhook URL here
    paymentInstrument: {
      type: 'PAY_PAGE'
    }
  };
  console.log('[PhonePe] ENV:', {
    PHONEPE_MERCHANT_ID,
    PHONEPE_SALT_KEY,
    PHONEPE_CLIENT_VERSION,
    PHONEPE_BASE_URL
  });
  console.log('[PhonePe] Payment payload:', payload);
  // Deno-compatible base64 encoding
  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  const payloadBase64 = toBase64(JSON.stringify(payload));
  // UAT endpoint path for payment initiation
  const phonepePath = '/v3/charge/initiate';
  // X-VERIFY: SHA256(base64Payload + endpoint + saltKey) + '###' + clientVersion
  const stringToSign = payloadBase64 + phonepePath + PHONEPE_SALT_KEY;
  async function sha256Hex(str) {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const hashHex = await sha256Hex(stringToSign);
  const xVerify = hashHex + '###' + PHONEPE_CLIENT_VERSION;
  console.log('[PhonePe] x-verify:', xVerify);
  // Call PhonePe API
  let result;
  try {
    const response = await fetch(PHONEPE_BASE_URL + phonepePath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': PHONEPE_MERCHANT_ID
      },
      body: JSON.stringify({ request: payloadBase64 })
    });
    const text = await response.text();
    try {
      result = JSON.parse(text);
    } catch (jsonErr) {
      console.error('[PhonePe] Failed to parse response as JSON:', text);
      return c.json({ success: false, error: 'Invalid response from PhonePe', details: text }, 502);
    }
    console.log('[PhonePe] API response:', result);
    if (!response.ok || result.success === false) {
      console.error('[PhonePe] payment initiation failed:', result);
      return c.json({ success: false, error: 'PhonePe payment initiation failed', details: result }, 502);
    }
    // Return payment URL/token to frontend
    return c.json({ success: true, data: result });
  } catch (err) {
    console.error('[PhonePe] Error calling API:', err);
    return c.json({ success: false, error: 'Error calling PhonePe API', details: err?.message || err }, 500);
  }
});

// PhonePe Webhook Handler
app.post('/gutzo-api/phonepe-webhook', async (c) => {
  const body = await c.req.json();
  // TODO: Validate webhook signature and update order/payment status in DB
  console.log('PhonePe Webhook:', body);
  // Respond to PhonePe
  return c.json({ success: true });
});

// Check database schema on startup (non-blocking)
checkDatabaseSchema();
// Health check
app.get('/gutzo-api/health', async (c)=>{
  try {
    // Test database connection
    const { data, error } = await supabase.from('vendors').select('id').limit(1);
    if (error) {
      console.error('Database connection test failed:', error);
      return c.json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
        details: error.message
      }, 500);
    }
    // Check subscription table status
    const { data: subscriptionTest, error: subscriptionError } = await supabase.from('product_subscriptions').select('id').limit(1);
    const subscriptionStatus = subscriptionError?.message?.includes('relation "product_subscriptions" does not exist') ? 'missing - needs manual creation' : subscriptionError ? `error: ${subscriptionError.message}` : 'available';
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      subscription_table: subscriptionStatus,
      message: 'Gutzo Marketplace API is running'
    });
  } catch (error) {
    console.error('Health check error:', error);
    return c.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    }, 500);
  }
});
// Get all vendors
app.get('/gutzo-api/vendors', async (c)=>{
  try {
    console.log('Fetching vendors from database...');
    const { data, error } = await supabase.from('vendors').select(`
        id,
        name,
        description,
        image,
        rating,
        delivery_time,
        minimum_order,
        delivery_fee,
        cuisine_type,
        phone,
        is_active,
        is_featured,
        tags,
        created_at
      `).eq('is_active', true).order('is_featured', {
      ascending: false
    }).order('rating', {
      ascending: false
    });
    if (error) {
      console.error('Database error fetching vendors:', error);
      return c.json({
        error: 'Failed to fetch vendors',
        details: error.message
      }, 500);
    }
    console.log(`Successfully fetched ${data?.length || 0} vendors from database`);
    // Transform data to match frontend expectations
    const transformedVendors = (data || []).map((vendor)=>({
        id: vendor.id,
        name: vendor.name,
        description: vendor.description,
        image: vendor.image,
        rating: vendor.rating,
        deliveryTime: vendor.delivery_time,
        minimumOrder: vendor.minimum_order,
        deliveryFee: vendor.delivery_fee,
        cuisineType: vendor.cuisine_type,
        phone: vendor.phone,
        isActive: vendor.is_active,
        isFeatured: vendor.is_featured,
        tags: vendor.tags || [],
        created_at: vendor.created_at
      }));
    return c.json(transformedVendors);
  } catch (error) {
    console.error('Failed to fetch vendors:', error);
    return c.json({
      error: 'Failed to fetch vendors',
      details: error.message
    }, 500);
  }
});
// Get single vendor by ID
app.get('/gutzo-api/vendors/:id', async (c)=>{
  try {
    const vendorId = c.req.param('id');
    console.log('Fetching vendor by ID:', vendorId);
    const { data, error } = await supabase.from('vendors').select(`
        id,
        name,
        description,
        image,
        rating,
        delivery_time,
        minimum_order,
        delivery_fee,
        cuisine_type,
        phone,
        is_active,
        is_featured,
        tags,
        created_at
      `).eq('id', vendorId).single();
    if (error?.code === 'PGRST116') {
      return c.json({
        error: 'Vendor not found'
      }, 404);
    }
    if (error) {
      console.error('Database error fetching vendor:', error);
      return c.json({
        error: 'Failed to fetch vendor',
        details: error.message
      }, 500);
    }
    // Transform data to match frontend expectations
    const transformedVendor = {
      id: data.id,
      name: data.name,
      description: data.description,
      image: data.image,
      rating: data.rating,
      deliveryTime: data.delivery_time,
      minimumOrder: data.minimum_order,
      deliveryFee: data.delivery_fee,
      cuisineType: data.cuisine_type,
      phone: data.phone,
      isActive: data.is_active,
      isFeatured: data.is_featured,
      tags: data.tags || [],
      created_at: data.created_at
    };
    return c.json(transformedVendor);
  } catch (error) {
    console.error('Failed to fetch vendor:', error);
    return c.json({
      error: 'Failed to fetch vendor',
      details: error.message
    }, 500);
  }
});
// Get products for a specific vendor
app.get('/gutzo-api/vendors/:id/products', async (c)=>{
  try {
    const vendorId = c.req.param('id');
    console.log('Fetching products for vendor:', vendorId);
    const { data, error } = await supabase.from('products').select(`
        id,
        vendor_id,
        name,
        description,
        price,
        image_url,
        category,
        tags,
        is_available,
        preparation_time,
        nutritional_info,
        ingredients,
        allergens,
        portion_size,
        spice_level,
        is_featured,
        created_at
      `).eq('vendor_id', vendorId).order('is_featured', {
      ascending: false
    }).order('created_at', {
      ascending: false
    });
    if (error) {
      console.error('Database error fetching products:', error);
      return c.json({
        error: 'Failed to fetch products',
        details: error.message
      }, 500);
    }
    console.log(`Successfully fetched ${data?.length || 0} products for vendor ${vendorId} from database`);
    // Transform products to match frontend expectations
    const productsWithAvailability = (data || []).map((product)=>({
        id: product.id,
        vendorId: product.vendor_id,
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image_url,
        category: product.category,
        tags: product.tags || [],
        available: Boolean(product.is_available),
        preparationTime: product.preparation_time,
        nutritionalInfo: product.nutritional_info,
        ingredients: product.ingredients || [],
        allergens: product.allergens || [],
        portionSize: product.portion_size,
        spiceLevel: product.spice_level,
        isFeatured: product.is_featured,
        created_at: product.created_at
      }));
    const availableCount = productsWithAvailability.filter((p)=>p.available).length;
    const unavailableCount = productsWithAvailability.filter((p)=>!p.available).length;
    console.log(`📦 Product Status for vendor ${vendorId}:`);
    console.log(`   ✅ Available: ${availableCount} products`);
    console.log(`   ❌ Unavailable: ${unavailableCount} products`);
    console.log(`   📊 Total: ${productsWithAvailability.length} products`);
    return c.json(productsWithAvailability);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return c.json({
      error: 'Failed to fetch products',
      details: error.message
    }, 500);
  }
});
// Get all products across all vendors
app.get('/gutzo-api/products', async (c)=>{
  try {
    console.log('Fetching all products...');
    const { data, error } = await supabase.from('products').select(`
        id,
        vendor_id,
        name,
        description,
        price,
        image_url,
        category,
        diet_tags,
        tags,
        is_available,
        created_at
      `).order('created_at', {
      ascending: false
    });
    if (error) {
      console.error('Database error fetching products:', error);
      return c.json({
        error: 'Failed to fetch products',
        details: error.message
      }, 500);
    }
    console.log(`Successfully fetched ${data?.length || 0} products from all vendors`);
    // Map products with availability status
    const allProductsWithAvailability = (data || []).map((product)=>({
        ...product,
        available: Boolean(product.is_available)
      }));
    const availableCount = allProductsWithAvailability.filter((p)=>p.available).length;
    const unavailableCount = allProductsWithAvailability.filter((p)=>!p.available).length;
    console.log(`📦 All Products Summary:`);
    console.log(`   ✅ Available: ${availableCount} products`);
    console.log(`   ❌ Unavailable: ${unavailableCount} products`);
    console.log(`   📊 Total: ${allProductsWithAvailability.length} products`);
    return c.json(allProductsWithAvailability);
  } catch (error) {
    console.error('Failed to fetch all products:', error);
    return c.json({
      error: 'Failed to fetch all products',
      details: error.message
    }, 500);
  }
});
// Get all categories
app.get('/gutzo-api/categories', async (c)=>{
  try {
    console.log('Fetching categories from database...');
    const { data, error } = await supabase.from('categories').select('id, name, image_url, created_at').order('name', {
      ascending: true
    });
    if (error) {
      console.error('Database error fetching categories:', error);
      return c.json({
        error: 'Failed to fetch categories',
        details: error.message
      }, 500);
    }
    console.log(`Successfully fetched ${data?.length || 0} categories from database`);
    return c.json(data || []);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return c.json({
      error: 'Failed to fetch categories',
      details: error.message
    }, 500);
  }
});
// Batch fetch products by IDs
app.post('/gutzo-api/products/batch', async (c) => {
  try {
    const body = await c.req.json();
    const productIds = body.productIds;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return c.json({ error: 'No productIds provided' }, 400);
    }
    // Fetch products from database
    const { data, error } = await supabase.from('products').select(`
      id,
      vendor_id,
      name,
      description,
      price,
      image_url,
      category,
      tags,
      is_available,
      created_at
    `).in('id', productIds);
    if (error) {
      console.error('Failed to batch fetch products:', error);
      return c.json({ error: 'Failed to fetch products', details: error.message }, 500);
    }
    // Transform products to match frontend expectations
    const products = (data || []).map((product) => ({
      id: product.id,
      vendorId: product.vendor_id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image_url,
      category: product.category,
      tags: product.tags || [],
      available: Boolean(product.is_available),
      created_at: product.created_at
    }));
    return c.json({ products });
  } catch (error) {
    console.error('Batch products endpoint error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});
// Get all available products across all vendors
app.get('/gutzo-api/products/available', async (c)=>{
  try {
    console.log('Fetching all available products...');
    const { data, error } = await supabase.from('products').select(`
        id,
        vendor_id,
        name,
        description,
        price,
        image_url,
        category,
        diet_tags,
        tags,
        is_available,
        created_at
      `).eq('is_available', true).order('created_at', {
      ascending: false
    });
    if (error) {
      console.error('Database error fetching available products:', error);
      return c.json({
        error: 'Failed to fetch available products',
        details: error.message
      }, 500);
    }
    console.log(`Successfully fetched ${data?.length || 0} available products from database`);
    // Add available field for consistency
    const availableProducts = (data || []).map((product)=>({
        ...product,
        available: true
      }));
    console.log(`📦 Available Products Summary: ${availableProducts.length} products`);
    return c.json(availableProducts);
  } catch (error) {
    console.error('Failed to fetch available products:', error);
    return c.json({
      error: 'Failed to fetch available products',
      details: error.message
    }, 500);
  }
});
// Get product subscription status
app.get('/gutzo-api/products/:id/subscription', async (c)=>{
  try {
    const productId = c.req.param('id');
    console.log('Fetching subscription status for product:', productId);
    const { data, error } = await supabase.from('product_subscriptions').select('id, product_id, has_subscription').eq('product_id', productId).single();
    if (error?.code === 'PGRST116') {
      // No subscription record found - return default
      return c.json({
        product_id: productId,
        has_subscription: false,
        message: 'No subscription available for this product'
      });
    }
    if (error?.message?.includes('relation "product_subscriptions" does not exist')) {
      // Table doesn't exist
      return c.json({
        product_id: productId,
        has_subscription: false,
        error: 'Subscription table not found',
        message: 'Please create the product_subscriptions table first'
      }, 503);
    }
    if (error) {
      console.error('Database error fetching subscription:', error);
      return c.json({
        error: 'Failed to fetch subscription status',
        details: error.message
      }, 500);
    }
    return c.json(data);
  } catch (error) {
    console.error('Failed to fetch subscription status:', error);
    return c.json({
      error: 'Failed to fetch subscription status',
      details: error.message
    }, 500);
  }
});
// Create or update product subscription
app.post('/gutzo-api/products/:id/subscription', async (c)=>{
  try {
    const productId = c.req.param('id');
    const body = await c.req.json();
    console.log('Creating/updating subscription for product:', productId);
    const subscriptionData = {
      product_id: productId,
      has_subscription: Boolean(body.has_subscription)
    };
    // Try to update existing record first
    const { data: existingData, error: existingError } = await supabase.from('product_subscriptions').select('id').eq('product_id', productId).single();
    if (existingError?.message?.includes('relation "product_subscriptions" does not exist')) {
      return c.json({
        error: 'Subscription table not found',
        message: 'Please create the product_subscriptions table first',
        sql_required: true
      }, 503);
    }
    if (existingData) {
      // Update existing record
      const { data, error } = await supabase.from('product_subscriptions').update({
        has_subscription: subscriptionData.has_subscription
      }).eq('product_id', productId).select().single();
      if (error) {
        console.error('Failed to update subscription:', error);
        return c.json({
          error: 'Failed to update subscription',
          details: error.message
        }, 500);
      }
      console.log('Successfully updated subscription:', data.id);
      return c.json(data);
    } else {
      // Create new record
      const { data, error } = await supabase.from('product_subscriptions').insert(subscriptionData).select().single();
      if (error) {
        console.error('Failed to create subscription:', error);
        return c.json({
          error: 'Failed to create subscription',
          details: error.message
        }, 500);
      }
      console.log('Successfully created subscription:', data.id);
      return c.json(data, 201);
    }
  } catch (error) {
    console.error('Failed to manage subscription:', error);
    return c.json({
      error: 'Failed to manage subscription',
      details: error.message
    }, 500);
  }
});
// Get all product subscriptions (for admin purposes)
app.get('/gutzo-api/subscriptions', async (c)=>{
  try {
    console.log('Fetching all product subscriptions...');
    const { data, error } = await supabase.from('product_subscriptions').select(`
        id,
        product_id,
        has_subscription,
        products(name, price, category)
      `).order('id', {
      ascending: false
    });
    if (error?.message?.includes('relation "product_subscriptions" does not exist')) {
      return c.json({
        error: 'Subscription table not found',
        message: 'Please create the product_subscriptions table first',
        subscriptions: []
      }, 503);
    }
    if (error) {
      console.error('Database error fetching subscriptions:', error);
      return c.json({
        error: 'Failed to fetch subscriptions',
        details: error.message
      }, 500);
    }
    console.log(`Successfully fetched ${data?.length || 0} product subscriptions from database`);
    return c.json(data || []);
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
    return c.json({
      error: 'Failed to fetch subscriptions',
      details: error.message
    }, 500);
  }
});
// Create new vendor
app.post('/gutzo-api/vendors', async (c)=>{
  try {
    const body = await c.req.json();
    console.log('Creating new vendor:', body.name);
    const vendorData = {
      name: body.name,
      description: body.description || '',
      location: body.location || '',
      rating: body.rating || 4.5,
      logo_url: body.logo_url || '',
      contact_whatsapp: body.contact_whatsapp || ''
    };
    const { data, error } = await supabase.from('vendors').insert(vendorData).select().single();
    if (error) {
      console.error('Failed to create vendor:', error);
      return c.json({
        error: 'Failed to create vendor',
        details: error.message
      }, 500);
    }
    console.log('Successfully created vendor:', data.id);
    return c.json(data, 201);
  } catch (error) {
    console.error('Failed to create vendor:', error);
    return c.json({
      error: 'Failed to create vendor',
      details: error.message
    }, 500);
  }
});
// Create new product for a vendor
app.post('/gutzo-api/vendors/:id/products', async (c)=>{
  try {
    const vendorId = c.req.param('id');
    const body = await c.req.json();
    console.log('Creating new product for vendor:', vendorId);
    const productData = {
      vendor_id: vendorId,
      name: body.name,
      description: body.description || '',
      price: body.price,
      image_url: body.image_url || body.image || '',
      category: body.category || 'Meals',
      diet_tags: body.diet_tags || [],
      tags: body.tags || [],
      is_available: body.is_available !== undefined ? body.is_available : true
    };
    const { data, error } = await supabase.from('products').insert(productData).select().single();
    if (error) {
      console.error('Failed to create product:', error);
      return c.json({
        error: 'Failed to create product',
        details: error.message
      }, 500);
    }
    console.log('Successfully created product:', data.id);
    // Add available field for consistency
    const productWithAvailability = {
      ...data,
      available: Boolean(data.is_available)
    };
    return c.json(productWithAvailability, 201);
  } catch (error) {
    console.error('Failed to create product:', error);
    return c.json({
      error: 'Failed to create product',
      details: error.message
    }, 500);
  }
});
// Email notifications endpoints
app.post('/gutzo-api/notifications', async (c)=>{
  try {
    const body = await c.req.json();
    const { email } = body;
    if (!email || !email.includes('@')) {
      return c.json({
        error: 'Valid email is required'
      }, 400);
    }
    console.log('Adding email to waitlist:', email);
    // Check if email already exists in waitlist
    const { data: existingWaitlist, error: waitlistCheckError } = await supabase.from('waitlist').select('id').eq('email', email.toLowerCase()).single();
    if (waitlistCheckError && waitlistCheckError.code !== 'PGRST116') {
      console.error('Failed to check existing waitlist:', waitlistCheckError);
      return c.json({
        error: 'Failed to subscribe to notifications',
        details: waitlistCheckError.message
      }, 500);
    }
    if (existingWaitlist) {
      return c.json({
        message: 'Email already registered for notifications',
        already_subscribed: true
      });
    }
    // Insert new email into waitlist
    const { data: waitlistData, error: waitlistError } = await supabase.from('waitlist').insert({
      email: email.toLowerCase()
    }).select().single();
    if (waitlistError) {
      console.error('Failed to add email to waitlist:', waitlistError);
      return c.json({
        error: 'Failed to subscribe to notifications',
        details: waitlistError.message
      }, 500);
    }
    console.log('Successfully added email to waitlist table:', waitlistData.id);
    return c.json({
      message: 'Successfully subscribed to notifications',
      id: waitlistData.id
    }, 201);
  } catch (error) {
    console.error('Failed to add email notification:', error);
    return c.json({
      error: 'Failed to subscribe to notifications',
      details: error.message
    }, 500);
  }
});
// Get notification count (for admin purposes)
app.get('/gutzo-api/notifications/count', async (c)=>{
  try {
    const { count, error } = await supabase.from('waitlist').select('*', {
      count: 'exact',
      head: true
    });
    if (error) {
      console.error('Failed to count notifications:', error);
      return c.json({
        error: 'Failed to get notification count',
        details: error.message
      }, 500);
    }
    return c.json({
      count: count || 0
    });
  } catch (error) {
    console.error('Failed to count notifications:', error);
    return c.json({
      error: 'Failed to get notification count',
      details: error.message
    }, 500);
  }
});
// Get all notifications (for admin/debug purposes)
app.get('/gutzo-api/notifications', async (c)=>{
  try {
    const { data, error } = await supabase.from('waitlist').select('id, email, created_at').order('created_at', {
      ascending: false
    });
    if (error) {
      console.error('Failed to get notifications:', error);
      return c.json({
        error: 'Failed to get notifications',
        details: error.message
      }, 500);
    }
    // Transform waitlist data to match notifications format
    const transformedData = data?.map((item)=>({
        ...item,
        type: 'gutzo_points_launch',
        status: 'active'
      })) || [];
    return c.json({
      notifications: transformedData,
      count: transformedData.length
    });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return c.json({
      error: 'Failed to get notifications',
      details: error.message
    }, 500);
  }
});
// WhatsApp OTP Authentication endpoints
// Send OTP via WhatsApp
app.post('/gutzo-api/send-otp', async (c)=>{
  try {
    const body = await c.req.json();
    const { phone } = body;
    // Validate phone number
    if (!phone || typeof phone !== 'string') {
      return c.json({
        success: false,
        error: 'Phone number is required and must be a string'
      }, 400);
    }
    // Validate phone number format (basic validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      return c.json({
        success: false,
        error: 'Invalid phone number format. Use international format (+1234567890)'
      }, 400);
    }
    console.log('Sending OTP to phone:', phone);
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Set expiration time (5 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    // Store OTP in database
    const { error: dbError } = await supabase.from('otp_verification').upsert({
      phone,
      otp: otp,
      expires_at: expiresAt.toISOString(),
      verified: false,
      attempts: 0,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'phone' // 👈 This tells Supabase to conflict on phone, not id
    });
    if (dbError) {
      console.error('Database error storing OTP:', dbError);
      return c.json({
        success: false,
        error: 'Failed to store OTP',
        details: dbError.message
      }, 500);
    }
    // Get WhatsApp credentials
    const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    if (!whatsappToken || !phoneNumberId) {
      console.error('Missing WhatsApp environment variables');
      return c.json({
        success: false,
        error: 'WhatsApp service not configured'
      }, 500);
    }
    // Send WhatsApp message
    const whatsappMessage = {
      messaging_product: "whatsapp",
      to: phone.replace('+', ''),
      type: "text",
      text: {
        body: `🔐 Your Gutzo verification code is: ${otp}\n\nThis code expires in 5 minutes. Don't share this code with anyone.`
      }
    };
    const whatsappResponse = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(whatsappMessage)
    });
    if (!whatsappResponse.ok) {
      const errorText = await whatsappResponse.text();
      console.error('WhatsApp API error:', {
        status: whatsappResponse.status,
        error: errorText
      });
      return c.json({
        success: false,
        error: 'Failed to send WhatsApp message',
        details: errorText
      }, 500);
    }
    const whatsappResult = await whatsappResponse.json();
    console.log('WhatsApp message sent successfully:', whatsappResult);
    return c.json({
      success: true,
      message: 'OTP sent successfully via WhatsApp'
    });
  } catch (error) {
    console.error('Unexpected error in send OTP:', error);
    return c.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, 500);
  }
});

// Enhanced Authentication endpoints for signup/login flow
// Check if user exists
app.post('/gutzo-api/check-user', async (c)=>{
  try {
    const body = await c.req.json();
    const { phone } = body;
    if (!phone || typeof phone !== 'string') {
      return c.json({
        success: false,
        error: 'Phone number is required'
      }, 400);
    }
    console.log('Checking if user exists for phone:', phone);
    // Check if user exists in the users table
    const { data: userData, error: userError } = await supabase.from('users').select('id, phone, name, email, created_at').eq('phone', phone).single();
    if (userError && userError.code !== 'PGRST116') {
      console.error('Database error checking user:', userError);
      // Handle specific database schema issues
      if (userError.message?.includes('column users.phone does not exist') || userError.message?.includes('relation "users" does not exist')) {
        return c.json({
          success: false,
          error: 'Database schema issue detected',
          details: 'Users table or phone column missing. Please run database migrations.',
          schema_error: true,
          migration_required: true
        }, 500);
      }
      return c.json({
        success: false,
        error: 'Failed to check user existence',
        details: userError.message
      }, 500);
    }
    const exists = !!userData;
    console.log(`User ${exists ? 'exists' : 'does not exist'} for phone: ${phone}`);
    return c.json({
      success: true,
      exists,
      user: exists ? userData : null
    });
  } catch (error) {
    console.error('Unexpected error in check user:', error);
    return c.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, 500);
  }
});
// Create new user (after OTP verification)
app.post('/gutzo-api/create-user', async (c)=>{
  try {
    const body = await c.req.json();
    const { phone, name, email } = body;
    if (!phone || !name || !email) {
      return c.json({
        success: false,
        error: 'Phone, name, and email are required'
      }, 400);
    }
    console.log('Creating new user for phone:', phone);
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase.from('users').select('id').eq('phone', phone).single();
    if (checkError && checkError.code !== 'PGRST116') {
      // Handle schema errors specifically
      if (checkError.message?.includes('column users.phone does not exist') || checkError.message?.includes('relation "users" does not exist')) {
        return c.json({
          success: false,
          error: 'Database schema issue detected',
          details: 'Users table or phone column missing. Please run database migrations.',
          schema_error: true,
          migration_required: true
        }, 500);
      }
    }
    if (existingUser) {
      return c.json({
        success: false,
        error: 'User already exists with this phone number'
      }, 400);
    }
    // Create new user
    const { data: userData, error: userError } = await supabase.from('users').insert({
      phone,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      verified: true,
      created_at: new Date().toISOString()
    }).select().single();
    if (userError) {
      console.error('Database error creating user:', userError);
      // Handle schema errors specifically
      if (userError.message?.includes('column users.phone does not exist') || userError.message?.includes('relation "users" does not exist')) {
        return c.json({
          success: false,
          error: 'Database schema issue detected',
          details: 'Users table or phone column missing. Please run database migrations.',
          schema_error: true,
          migration_required: true
        }, 500);
      }
      return c.json({
        success: false,
        error: 'Failed to create user',
        details: userError.message
      }, 500);
    }
    console.log('Successfully created user:', userData.id);
    return c.json({
      success: true,
      message: 'User created successfully',
      user: userData
    });
  } catch (error) {
    console.error('Unexpected error in create user:', error);
    return c.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, 500);
  }
});

// Verify OTP (updated endpoint path)
app.post('/gutzo-api/verify-otp', async (c)=>{
  try {
    const body = await c.req.json();
    const { phone, otp } = body;
    // Validate inputs
    if (!phone || !otp || typeof phone !== 'string' || typeof otp !== 'string') {
      return c.json({
        success: false,
        error: 'Phone number and OTP are required'
      }, 400);
    }
    // Validate OTP format (6 digits)
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otp)) {
      return c.json({
        success: false,
        error: 'OTP must be 6 digits'
      }, 400);
    }
    console.log('Verifying OTP for phone:', phone);
    // Query for matching OTP record
    const { data: otpRecord, error: queryError } = await supabase.from('otp_verification').select('*').eq('phone', phone).eq('otp', otp).eq('verified', false).order('created_at', {
      ascending: false
    }).limit(1).single();
    if (queryError && queryError.code !== 'PGRST116') {
      console.error('Database error querying OTP:', queryError);
      return c.json({
        success: false,
        error: 'Failed to verify OTP',
        details: queryError.message
      }, 500);
    }
    if (!otpRecord) {
      return c.json({
        success: false,
        error: 'Invalid or expired OTP'
      }, 400);
    }
    // Check if OTP has expired
    const now = new Date();
    const expirationTime = new Date(otpRecord.expires_at);
    if (now > expirationTime) {
      return c.json({
        success: false,
        error: 'OTP has expired. Please request a new one.'
      }, 400);
    }
    // Mark OTP as verified
    const { error: updateError } = await supabase.from('otp_verification').update({
      verified: true,
      verified_at: new Date().toISOString()
    }).eq('id', otpRecord.id);
    if (updateError) {
      console.error('Database error updating OTP:', updateError);
      return c.json({
        success: false,
        error: 'Failed to verify OTP',
        details: updateError.message
      }, 500);
    }
    console.log('OTP verified successfully for phone:', phone);
    return c.json({
      success: true,
      message: 'OTP verified successfully',
      user: {
        phone,
        verified: true
      }
    });
  } catch (error) {
    console.error('Unexpected error in verify OTP:', error);
    return c.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, 500);
  }
});
// 🆕 USER VALIDATION ENDPOINT - validates if user exists and is verified in database
app.post('/gutzo-api/validate-user', async (c)=>{
  try {
    const { phone } = await c.req.json();
    if (!phone) {
      return c.json({
        error: 'Phone number is required'
      }, 400);
    }
    console.log(`🔍 Validating user with phone: ${phone}`);
    // Query users table to check if user exists and is verified
    const { data: user, error } = await supabase.from('users').select('verified').eq('phone', phone).single();
    if (error) {
      // User not found is expected - not an error case
      if (error.code === 'PGRST116') {
        console.log(`❌ User not found for phone: ${phone}`);
        return c.json({
          userExists: false,
          verified: false
        });
      }
      console.error('Database error during user validation:', error);
      return c.json({
        error: 'Database validation failed'
      }, 500);
    }
    const userExists = !!user;
    const verified = user?.verified || false;
    console.log(`✅ User validation result: phone=${phone}, exists=${userExists}, verified=${verified}`);
    return c.json({
      userExists,
      verified
    });
  } catch (error) {
    console.error('Error validating user:', error);
    return c.json({
      error: 'Validation failed'
    }, 500);
  }
});
// Get user data by phone number - fetches detailed user information from database
app.post('/gutzo-api/get-user', async (c)=>{
  try {
    const { phone } = await c.req.json();
    if (!phone) {
      return c.json({
        error: 'Phone number is required'
      }, 400);
    }
    console.log('🔍 Fetching user data from Supabase for phone:', phone);
    // Normalize phone number - add +91 prefix if not present
    let normalizedPhone = phone.toString().trim();
    if (!normalizedPhone.startsWith('+91') && !normalizedPhone.startsWith('91')) {
      normalizedPhone = `+91${normalizedPhone}`;
    } else if (normalizedPhone.startsWith('91') && !normalizedPhone.startsWith('+91')) {
      normalizedPhone = `+${normalizedPhone}`;
    }
    console.log('📱 Normalized phone number for database query:', normalizedPhone);
    // Query users table to get user information using normalized phone
    const { data: userData, error: userError } = await supabase.from('users').select('id, name, phone, email, verified, created_at').eq('phone', normalizedPhone).single();
    if (userError?.code === 'PGRST116') {
      // User not found - try alternative format as fallback
      console.log('❌ User not found with normalized phone, trying alternative formats...');
      // Try without +91 prefix
      const alternativePhone = phone.toString().trim();
      const { data: altUserData, error: altUserError } = await supabase.from('users').select('id, name, phone, email, verified, created_at').eq('phone', alternativePhone).single();
      if (altUserError?.code === 'PGRST116') {
        console.log('❌ User not found in database for phone:', phone, 'or', normalizedPhone);
        return c.json({
          error: 'User not found',
          phone: phone,
          normalizedPhone: normalizedPhone,
          userExists: false,
          verified: false
        }, 404);
      } else if (altUserError) {
        console.error('❌ Database error fetching user with alternative phone:', altUserError);
        return c.json({
          error: 'Failed to fetch user data',
          details: altUserError.message,
          userExists: false,
          verified: false
        }, 500);
      } else {
        // Found with alternative format
        console.log('✅ User found with alternative phone format:', alternativePhone);
        return c.json({
          id: altUserData.id,
          name: altUserData.name,
          phone: altUserData.phone,
          verified: altUserData.verified,
          userExists: true,
          created_at: altUserData.created_at
        });
      }
    }
    if (userError?.message?.includes('relation "users" does not exist')) {
      console.error('❌ Users table does not exist');
      return c.json({
        error: 'Database not properly configured - users table missing',
        userExists: false,
        verified: false
      }, 503);
    }
    if (userError) {
      console.error('❌ Database error fetching user:', userError);
      return c.json({
        error: 'Failed to fetch user data',
        details: userError.message,
        userExists: false,
        verified: false
      }, 500);
    }
    console.log('✅ User data fetched successfully:', {
      id: userData.id,
      name: userData.name,
      phone: userData.phone,
      email: userData.email,
      verified: userData.verified
    });
    // Return user data in the format expected by frontend
    return c.json({
      id: userData.id,
      name: userData.name,
      phone: userData.phone,
      email: userData.email,
      verified: userData.verified,
      userExists: true,
      created_at: userData.created_at
    });
  } catch (error) {
    console.error('❌ Failed to fetch user data:', error);
    return c.json({
      error: 'Failed to fetch user data',
      details: error.message,
      userExists: false,
      verified: false
    }, 500);
  }
});
app.post('/gutzo-api/get-user-cart', async (c)=>{
  try {
    const body = await c.req.json();
    console.log('get-user-cart: Incoming request body:', body);
    const { userPhone } = body;
    if (!userPhone) {
      console.error('get-user-cart: Missing userPhone in request body:', body);
      return c.json({
        error: 'User phone is required',
        receivedBody: body
      }, 400);
    }
    console.log('📥 Fetching user cart for:', userPhone);
    // Fetch cart items (lean structure)
    const { data: cartData, error: cartError } = await supabase.from('cart').select('product_id, vendor_id, quantity, created_at').eq('user_phone', userPhone);
    console.log('get-user-cart: Cart query result:', { cartData, cartError });
    if (cartError) {
      console.error('❌ Database error fetching cart:', cartError);
      return c.json({
        error: 'Failed to fetch cart',
        details: cartError.message
      }, 500);
    }
    if (!cartData || cartData.length === 0) {
      console.log('📭 No cart items found for user');
      return c.json({
        items: [],
        totalItems: 0,
        totalAmount: 0
      });
    }
    console.log(`✅ Found ${cartData.length} cart items, fetching fresh product data...`);
    // Get unique product IDs to fetch fresh product details
    const productIds = cartData.map((item)=>item.product_id);
    console.log('get-user-cart: Product IDs to fetch:', productIds);
    // Fetch fresh product details with vendor info
    const { data: productsData, error: productsError } = await supabase.from('products').select(`
        id,
        vendor_id,
        name,
        description,
        price,
        image_url,
        category,
        is_available,
        vendors!inner (
          id,
          name,
          image
        )
      `).in('id', productIds);
    console.log('get-user-cart: Products query result:', { productsData, productsError });
    if (productsError) {
      console.error('❌ Error fetching fresh product details:', productsError);
      return c.json({
        error: 'Failed to fetch product details',
        details: productsError.message
      }, 500);
    }
    // Combine cart data with fresh product details
    const enrichedCartItems = cartData.map((cartItem)=>{
      const product = productsData?.find((p)=>p.id === cartItem.product_id);
      if (!product) {
        console.warn(`⚠️ Product ${cartItem.product_id} not found, skipping cart item`);
        return null;
      }
      return {
        productId: cartItem.product_id,
        vendorId: cartItem.vendor_id,
        quantity: cartItem.quantity,
        // Fresh product data
        name: product.name,
        price: product.price,
        image: product.image_url,
        category: product.category,
        available: Boolean(product.is_available),
        vendorName: product.vendors.name,
        vendor: {
          id: product.vendors.id,
          name: product.vendors.name,
          image: product.vendors.image
        },
        product: {
          image: product.image_url,
          description: product.description,
          category: product.category
        }
      };
    }).filter(Boolean); // Remove null items (products not found)
    // Calculate totals from fresh data
    const totalItems = enrichedCartItems.reduce((sum, item)=>sum + item.quantity, 0);
    const totalAmount = enrichedCartItems.reduce((sum, item)=>sum + item.price * item.quantity, 0);
    console.log(`✅ Returning enriched cart: ${enrichedCartItems.length} items, total: ₹${totalAmount}`);
    return c.json({
      items: enrichedCartItems,
      totalItems,
      totalAmount
    });
  } catch (error) {
    console.error('❌ Failed to fetch user cart:', error);
    return c.json({
      error: 'Failed to fetch user cart',
      details: error.message
    }, 500);
  }
});
app.post('/gutzo-api/save-user-cart', async (c)=>{
  try {
    const { userPhone, items } = await c.req.json();
    if (!userPhone) {
      return c.json({
        error: 'User phone is required'
      }, 400);
    }
    if (!items || !Array.isArray(items)) {
      return c.json({
        error: 'Items array is required'
      }, 400);
    }
    console.log(`💾 Saving cart for user ${userPhone} with ${items.length} items`);
    // Clear existing cart items for user
    const { error: deleteError } = await supabase.from('cart').delete().eq('user_phone', userPhone);
    if (deleteError) {
      console.error('❌ Error clearing existing cart:', deleteError);
      return c.json({
        error: 'Failed to clear existing cart',
        details: deleteError.message
      }, 500);
    }
    // Insert new cart items (lean structure - only essential data)
    if (items.length > 0) {
      const leanCartItems = items.map((item)=>({
          user_phone: userPhone,
          product_id: item.productId,
          vendor_id: item.vendorId,
          quantity: item.quantity
        }));
      const { error: insertError } = await supabase.from('cart').insert(leanCartItems);
      if (insertError) {
        console.error('❌ Error inserting cart items:', insertError);
        return c.json({
          error: 'Failed to save cart items',
          details: insertError.message
        }, 500);
      }
    }
    console.log(`✅ Successfully saved ${items.length} cart items for user ${userPhone}`);
    return c.json({
      success: true,
      message: 'Cart saved successfully',
      itemCount: items.length
    });
  } catch (error) {
    console.error('❌ Failed to save user cart:', error);
    return c.json({
      error: 'Failed to save user cart',
      details: error.message
    }, 500);
  }
});
app.post('/gutzo-api/update-cart-item', async (c)=>{
  try {
    const { userPhone, productId, quantity } = await c.req.json();
    console.log('🔄 Updating cart item:', {
      userPhone,
      productId,
      quantity
    });
    if (!userPhone || !productId || quantity < 0) {
      return c.json({
        error: 'Missing required fields or invalid quantity'
      }, 400);
    }
    if (quantity === 0) {
      // Remove item from cart
      const { error: deleteError } = await supabase.from('cart').delete().eq('user_phone', userPhone).eq('product_id', productId);
      if (deleteError) {
        console.error('❌ Error removing cart item:', deleteError);
        return c.json({
          error: 'Failed to remove cart item',
          details: deleteError.message
        }, 500);
      }
      console.log(`🗑️ Removed item ${productId} from cart for user ${userPhone}`);
    } else {
      // First get the vendor_id from the product
      const { data: product } = await supabase.from('products').select('vendor_id').eq('id', productId).single();
      // Update or insert cart item
      const { error: upsertError } = await supabase.from('cart').upsert({
        user_phone: userPhone,
        product_id: productId,
        vendor_id: product?.vendor_id || null,
        quantity: quantity
      }, {
        onConflict: 'user_phone,product_id'
      });
      if (upsertError) {
        console.error('❌ Error updating cart item:', upsertError);
        return c.json({
          error: 'Failed to update cart item',
          details: upsertError.message
        }, 500);
      }
      console.log(`✅ Updated cart item ${productId} to quantity ${quantity} for user ${userPhone}`);
    }
    return c.json({
      success: true
    });
  } catch (error) {
    console.error('❌ Failed to update cart item:', error);
    return c.json({
      error: 'Failed to update cart item',
      details: error.message
    }, 500);
  }
});
app.post('/gutzo-api/clear-user-cart', async (c)=>{
  try {
    const { userPhone } = await c.req.json();
    console.log('🧹 Clearing cart for user:', userPhone);
    if (!userPhone) {
      return c.json({
        error: 'User phone is required'
      }, 400);
    }
    // Clear all cart items for this user
    const { error: deleteError } = await supabase.from('cart').delete().eq('user_phone', userPhone);
    if (deleteError) {
      console.error('❌ Error clearing user cart:', deleteError);
      return c.json({
        error: 'Failed to clear cart',
        details: deleteError.message
      }, 500);
    }
    console.log(`✅ Successfully cleared cart for user ${userPhone}`);
    return c.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('❌ Failed to clear user cart:', error);
    return c.json({
      error: 'Failed to clear cart',
      details: error.message
    }, 500);
  }
});
/*********************************************************/ /*********************************************************/ // Get user ID from phone (helper function)
async function getUserIdFromPhone(phone) {
  // Look up user by phone in custom users table
  const { data: user, error } = await supabase.from('users').select('id').eq('phone', phone).single();
  if (error) {
    console.error(`Error looking up user by phone ${phone}:`, error.message);
    return null;
  }
  if (!user) {
    console.warn(`No user found in users table for phone: ${phone}`);
    return null;
  }
  return user.id;
}
// Get user addresses
app.get('/gutzo-api/user-addresses/:phone', async (c)=>{
  try {
    const phone = c.req.param('phone');
    console.log('📍 Fetching addresses for phone:', phone);
    // Get user ID from phone using custom users table
    const userId = await getUserIdFromPhone(phone);
    if (!userId) {
      return c.json({ error: 'User not found' }, 404);
    }
    const { data, error } = await supabase.from('user_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false }).order('created_at', { ascending: false });
    if (error) {
      console.error('❌ Error fetching addresses:', error);
      return c.json({
        error: 'Failed to fetch addresses',
        details: error.message
      }, 500);
    }
    console.log(`✅ Found ${data?.length || 0} addresses for user`);
    return c.json(data || []);
  } catch (error) {
    console.error('❌ Failed to fetch addresses:', error);
    return c.json({
      error: 'Failed to fetch addresses',
      details: error.message
    }, 500);
  }
});
// Get available address types for user
app.get('/gutzo-api/user-addresses/:phone/available-types', async (c) => {
  try {
    const phone = c.req.param('phone');
    const userId = await getUserIdFromPhone(phone);
    if (!userId) return c.json({ error: 'User not found' }, 404);
    const { data, error } = await supabase.from('user_addresses').select('type').eq('user_id', userId);
    if (error) return c.json({ error: 'Failed to check address types', details: error.message }, 500);
    const usedTypes = data?.map((addr) => addr.type) || [];
    const allTypes = ['home', 'work', 'other'];
    const availableTypes = allTypes.filter((type) => {
      if (type === 'other') return true;
      return !usedTypes.includes(type);
    });
    return c.json({ availableTypes, usedTypes });
  } catch (error) {
    return c.json({ error: 'Failed to check available address types', details: error.message }, 500);
  }
});
// Alias without prefix to support invocation at /functions/v1/gutzo-api/user-addresses -> internal /user-addresses
app.get('/gutzo-api/user-addresses/:phone', async (c)=>{
  try {
    const phone = c.req.param('phone');
    console.log('📍 [ALIAS] Fetching addresses for phone:', phone);
    const userId = await getUserIdFromPhone(phone);
    if (!userId) {
      return c.json({ error: 'User not found' }, 404);
    }
    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      console.error('❌ Error fetching addresses (alias):', error);
      return c.json({ error: 'Failed to fetch addresses', details: error.message }, 500);
    }
    return c.json(data || []);
  } catch (error) {
    console.error('❌ Failed to fetch addresses (alias):', error);
    return c.json({ error: 'Failed to fetch addresses', details: error.message }, 500);
  }
});
// Create new address
app.post('/gutzo-api/user-addresses', async (c)=>{
  try {
    const body = await c.req.json();
    const { userPhone, type, label, street, area, landmark, fullAddress, latitude, longitude, isDefault } = body;
    console.log('📍 Creating new address for phone:', userPhone);
    // Get user ID from phone using custom users table
    const userId = await getUserIdFromPhone(userPhone);
    if (!userId) {
      return c.json({ error: 'User not found' }, 404);
    }
    // Validate required fields
    if (!type || !street || !fullAddress) {
      return c.json({
        error: 'Required fields missing: type, street, fullAddress'
      }, 400);
    }
    // Validate custom label for "other" type
    if (type === 'other' && !label) {
      return c.json({
        error: 'Custom label is required for \'other\' address type'
      }, 400);
    }
    // If setting as default, unset other defaults first
    if (isDefault) {
      await supabase.from('user_addresses').update({
        is_default: false
      }).eq('user_id', userId);
    }
    const addressData = {
      user_id: userId,
      type,
      label: type === 'other' ? label : null,
      street,
      area: area || null,
      landmark: landmark || null,
      full_address: fullAddress,
      latitude: latitude || null,
      longitude: longitude || null,
      is_default: isDefault || false
    };
    const { data, error } = await supabase.from('user_addresses').insert(addressData).select().single();
    if (error) {
      console.error('❌ Error creating address:', error);
      return c.json({
        error: 'Failed to create address',
        details: error.message
      }, 500);
    }
    console.log('✅ Successfully created address:', data.id);
    return c.json(data, 201);
  } catch (error) {
    console.error('❌ Failed to create address:', error);
    return c.json({
      error: 'Failed to create address',
      details: error.message
    }, 500);
  }
});
// Alias without prefix
app.post('/gutzo-api/user-addresses', async (c)=>{
  try {
    const body = await c.req.json();
    const { userPhone, type, label, street, area, landmark, fullAddress, latitude, longitude, isDefault } = body;
    console.log('📍 [ALIAS] Creating new address for phone:', userPhone);
    const userId = await getUserIdFromPhone(userPhone);
    if (!userId) return c.json({ error: 'User not found' }, 404);
    if (!type || !street || !fullAddress) return c.json({ error: 'Required fields missing: type, street, fullAddress' }, 400);
    if (type === 'other' && !label) return c.json({ error: "Custom label is required for 'other' address type" }, 400);
    if (isDefault) {
      await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', userId);
    }
    const addressData = {
      user_id: userId,
      type,
      label: type === 'other' ? label : null,
      street,
      area: area || null,
      landmark: landmark || null,
      full_address: fullAddress,
      latitude: latitude || null,
      longitude: longitude || null,
      is_default: isDefault || false,
    };
    const { data, error } = await supabase.from('user_addresses').insert(addressData).select().single();
    if (error) return c.json({ error: 'Failed to create address', details: error.message }, 500);
    return c.json(data, 201);
  } catch (error) {
    console.error('❌ Failed to create address (alias):', error);
    return c.json({ error: 'Failed to create address', details: error.message }, 500);
  }
});
// Update address
app.put('/gutzo-api/user-addresses/:id', async (c)=>{
  try {
    const addressId = c.req.param('id');
    const body = await c.req.json();
    const { type, label, street, area, landmark, fullAddress, latitude, longitude, isDefault, userPhone } = body;
    console.log('📍 Updating address:', addressId);
    // Validate custom label for "other" type
    if (type === 'other' && !label) {
      return c.json({
        error: 'Custom label is required for \'other\' address type'
      }, 400);
    }
    // If setting as default, unset other defaults first
    if (isDefault && userPhone) {
      const userId = await getUserIdFromPhone(userPhone);
      if (userId) {
        await supabase.from('user_addresses').update({
          is_default: false
        }).eq('user_id', userId);
      }
    }
    const updateData = {
      type,
      label: type === 'other' ? label : null,
      street,
      area: area || null,
      landmark: landmark || null,
      full_address: fullAddress,
      latitude: latitude || null,
      longitude: longitude || null,
      is_default: isDefault || false
    };
    const { data, error } = await supabase.from('user_addresses').update(updateData).eq('id', addressId).select().single();
    if (error) {
      console.error('❌ Error updating address:', error);
      return c.json({
        error: 'Failed to update address',
        details: error.message
      }, 500);
    }
    console.log('✅ Successfully updated address:', addressId);
    return c.json(data);
  } catch (error) {
    console.error('❌ Failed to update address:', error);
    return c.json({
      error: 'Failed to update address',
      details: error.message
    }, 500);
  }
});
// Alias without prefix
app.put('/gutzo-api/user-addresses/:id', async (c)=>{
  try {
    const addressId = c.req.param('id');
    const body = await c.req.json();
    const { type, label, street, area, landmark, fullAddress, latitude, longitude, isDefault, userPhone } = body;
    console.log('📍 [ALIAS] Updating address:', addressId);
    if (type === 'other' && !label) return c.json({ error: "Custom label is required for 'other' address type" }, 400);
    if (isDefault && userPhone) {
      const userId = await getUserIdFromPhone(userPhone);
      if (userId) {
        await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', userId);
      }
    }
    const updateData = {
      type,
      label: type === 'other' ? label : null,
      street,
      area: area || null,
      landmark: landmark || null,
      full_address: fullAddress,
      latitude: latitude || null,
      longitude: longitude || null,
      is_default: isDefault || false,
    };
    const { data, error } = await supabase.from('user_addresses').update(updateData).eq('id', addressId).select().single();
    if (error) return c.json({ error: 'Failed to update address', details: error.message }, 500);
    return c.json(data);
  } catch (error) {
    console.error('❌ Failed to update address (alias):', error);
    return c.json({ error: 'Failed to update address', details: error.message }, 500);
  }
});
// Delete address
app.delete('/gutzo-api/user-addresses/:id', async (c)=>{
  try {
    const addressId = c.req.param('id');
    console.log('📍 [DELETE] Attempting to delete address:', addressId);
    // Check if address exists before deleting
    const { data: existing, error: fetchError } = await supabase.from('user_addresses').select('id').eq('id', addressId).single();
    if (fetchError) {
      console.error('❌ Error fetching address before delete:', fetchError);
      return c.json({
        error: 'Address not found or fetch error',
        details: fetchError.message
      }, 404);
    }
    if (!existing) {
      console.warn('⚠️ Address not found for deletion:', addressId);
      return c.json({
        error: 'Address not found',
        id: addressId
      }, 404);
    }
    const { error: deleteError } = await supabase.from('user_addresses').delete().eq('id', addressId);
    if (deleteError) {
      console.error('❌ Error deleting address:', deleteError);
      return c.json({
        error: 'Failed to delete address',
        details: deleteError.message,
        id: addressId
      }, 500);
    }
    console.log('✅ Successfully deleted address:', addressId);
    return c.json({
      success: true,
      message: 'Address deleted successfully',
      id: addressId
    });
  } catch (error) {
    console.error('❌ Failed to delete address:', error);
    return c.json({
      error: 'Failed to delete address',
      details: error.message
    }, 500);
  }
});
/*********************************************************/ 
Deno.serve(app.fetch);
