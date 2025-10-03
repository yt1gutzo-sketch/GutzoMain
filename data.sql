--
-- PostgreSQL database dump
--

\restrict dJZEcdavjfq1t0PAiRsCB7vPDMDthKhQqE6TRhxB2qrXHtzzba9vRyVfXyVWWfJ

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: address_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.address_type AS ENUM (
    'home',
    'work',
    'other'
);


--
-- Name: ensure_single_default_address(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_default_address() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- If setting this address as default, unset all other defaults for this user
    IF NEW.is_default = true THEN
        UPDATE user_addresses 
        SET is_default = false 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: get_user_default_address(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_default_address(input_user_id uuid) RETURNS TABLE(id uuid, type character varying, custom_tag character varying, house_number character varying, apartment_road character varying, complete_address text, latitude numeric, longitude numeric, phone character varying, display_type text, short_address text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.id,
        ua.type,
        ua.custom_tag,
        ua.house_number,
        ua.apartment_road,
        ua.complete_address,
        ua.latitude,
        ua.longitude,
        ua.phone,
        uad.display_type,
        uad.short_address
    FROM public.user_addresses ua
    JOIN public.user_addresses_display uad ON ua.id = uad.id
    WHERE ua.user_id = input_user_id 
    AND ua.is_default = TRUE
    LIMIT 1;
END;
$$;


--
-- Name: update_cart_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_cart_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_user_addresses_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_addresses_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;


--
-- Name: upsert_otp_verification(text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_otp_verification(p_phone text, p_otp text, p_expires_at timestamp with time zone) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  result_id UUID;
BEGIN
  -- Try to update existing record first
  UPDATE otp_verification 
  SET 
    otp = p_otp,
    expires_at = p_expires_at,
    verified = FALSE,
    attempts = 0,
    created_at = NOW(),
    verified_at = NULL
  WHERE phone = p_phone
  RETURNING id INTO result_id;
  
  -- If no record was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO otp_verification (phone, otp, expires_at, verified, attempts, created_at)
    VALUES (p_phone, p_otp, p_expires_at, FALSE, 0, NOW())
    RETURNING id INTO result_id;
  END IF;
  
  RETURN result_id;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_phone character varying(15) NOT NULL,
    product_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_quantity_positive CHECK ((quantity > 0))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    icon_name text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: kv_store_6985f4e9; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kv_store_6985f4e9 (
    key text NOT NULL,
    value jsonb NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    product_id uuid,
    vendor_id uuid,
    product_name text NOT NULL,
    product_description text,
    product_image_url text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    special_instructions text,
    customizations jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    vendor_id uuid,
    order_number text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    order_type text DEFAULT 'instant'::text NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    delivery_fee numeric(10,2) DEFAULT 0,
    packaging_fee numeric(10,2) DEFAULT 5,
    taxes numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    delivery_address jsonb NOT NULL,
    delivery_phone text,
    estimated_delivery_time timestamp with time zone,
    actual_delivery_time timestamp with time zone,
    payment_id text,
    payment_method text,
    payment_status text DEFAULT 'pending'::text,
    special_instructions text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: otp_verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_verification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    otp text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false,
    attempts integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    verified_at timestamp with time zone
);


--
-- Name: product_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    vendor_id uuid,
    subscription_name text NOT NULL,
    frequency text NOT NULL,
    duration_weeks integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    amount_per_delivery numeric(10,2) NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    delivery_time text,
    delivery_days integer[],
    delivery_address jsonb NOT NULL,
    payment_id text,
    payment_method text,
    payment_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    image_url text,
    category text NOT NULL,
    tags text[],
    is_available boolean DEFAULT true,
    preparation_time integer DEFAULT 15,
    nutritional_info jsonb,
    ingredients text[],
    allergens text[],
    portion_size text,
    spice_level text,
    is_featured boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscription_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid,
    order_id uuid,
    scheduled_date date NOT NULL,
    delivery_status text DEFAULT 'scheduled'::text,
    delivered_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscription_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid,
    product_id uuid,
    product_name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_addresses (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type public.address_type NOT NULL,
    label character varying(50),
    street character varying(200) NOT NULL,
    area character varying(100),
    landmark character varying(15),
    full_address text NOT NULL,
    city character varying(50) DEFAULT 'Coimbra'::character varying NOT NULL,
    state character varying(50) DEFAULT 'Coimbra'::character varying NOT NULL,
    country character varying(50) DEFAULT 'Portugal'::character varying NOT NULL,
    postal_code character varying(10),
    latitude numeric(10,8),
    longitude numeric(11,8),
    delivery_instructions text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    name text,
    email text,
    verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    image text,
    rating numeric(2,1) DEFAULT 4.5,
    delivery_time text DEFAULT '25-30 mins'::text,
    minimum_order numeric(10,2) DEFAULT 0,
    delivery_fee numeric(10,2) DEFAULT 0,
    cuisine_type text,
    address text,
    phone text,
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    opening_hours jsonb,
    tags text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Data for Name: cart; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart (id, user_phone, product_id, vendor_id, quantity, created_at, updated_at) FROM stdin;
e87c67e5-8bbd-40d2-8e25-344cd1b9af62	+919944751745	650e8400-e29b-41d4-a716-446655440002	550e8400-e29b-41d4-a716-446655440010	1	2025-09-27 13:28:04.299463+00	2025-09-27 13:28:04.299463+00
8c10dd85-3245-4e1d-8bec-962a16aed158	+919003802398	650e8400-e29b-41d4-a716-446655440002	550e8400-e29b-41d4-a716-446655440010	1	2025-09-21 07:08:30.213094+00	2025-09-21 07:08:30.213094+00
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, description, image_url, icon_name, sort_order, is_active, created_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440001	Salads	Fresh and healthy salad options	\N	Salad	1	t	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440002	Bowls	Nutritious bowl meals	\N	Bowl	2	t	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440003	Beverages	Healthy drinks and juices	\N	Coffee	3	t	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440004	Snacks	Light and healthy snacks	\N	Cookie	4	t	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440005	Desserts	Guilt-free healthy desserts	\N	IceCream	5	t	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440006	Smoothies	Fresh fruit and vegetable smoothies	\N	Grape	6	t	2025-09-13 20:16:24.304145+00
\.


--
-- Data for Name: kv_store_6985f4e9; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kv_store_6985f4e9 (key, value) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, vendor_id, product_name, product_description, product_image_url, quantity, unit_price, total_price, special_instructions, customizations, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, user_id, vendor_id, order_number, status, order_type, subtotal, delivery_fee, packaging_fee, taxes, discount_amount, total_amount, delivery_address, delivery_phone, estimated_delivery_time, actual_delivery_time, payment_id, payment_method, payment_status, special_instructions, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: otp_verification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.otp_verification (id, phone, otp, expires_at, verified, attempts, created_at, verified_at) FROM stdin;
2754df45-b7f2-4ad2-9564-a3b2873b3c7f	+919043747310	328794	2025-09-19 07:06:23.987+00	t	0	2025-09-19 07:01:23.987+00	2025-09-19 07:01:43.892+00
66f05f7c-a308-4f20-98d4-f32a21388014	+917397725100	852618	2025-09-20 12:10:39.622+00	t	0	2025-09-20 12:05:39.623+00	2025-09-20 12:05:53.05+00
e0f81168-4c0a-401c-927f-18f26bbc564e	+919003802398	473193	2025-09-21 07:13:20.135+00	t	0	2025-09-21 07:08:20.135+00	2025-09-21 07:08:27.28+00
c74ad43e-a765-44e9-bc49-1dc961c73e94	+919944751745	334477	2025-09-27 16:48:04.106+00	f	0	2025-09-27 16:43:04.106+00	2025-09-27 13:27:48.166+00
\.


--
-- Data for Name: product_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_subscriptions (id, user_id, vendor_id, subscription_name, frequency, duration_weeks, start_date, end_date, total_amount, amount_per_delivery, status, delivery_time, delivery_days, delivery_address, payment_id, payment_method, payment_status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, vendor_id, name, description, price, image_url, category, tags, is_available, preparation_time, nutritional_info, ingredients, allergens, portion_size, spice_level, is_featured, sort_order, created_at, updated_at) FROM stdin;
650e8400-e29b-41d4-a716-446655440001	550e8400-e29b-41d4-a716-446655440010	Tropical Paradise Bowl	A refreshing mix of mango, pineapple, kiwi, and passion fruit topped with coconut flakes and chia seeds	189.00	https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&h=300&fit=crop	Bowls	{Vegan,Gluten-Free,High-Fiber}	t	8	{"fat": 3, "carbs": 65, "fiber": 8, "protein": 4, "calories": 280}	{Mango,Pineapple,Kiwi,"Passion Fruit","Coconut Flakes","Chia Seeds"}	{None}	Regular	None	t	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440003	550e8400-e29b-41d4-a716-446655440010	Green Goddess Smoothie	Spinach, banana, apple, and spirulina power smoothie	159.00	https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=300&fit=crop	Smoothies	{Vegan,Detox,Iron-Rich}	t	5	{"fat": 2, "carbs": 42, "fiber": 7, "protein": 6, "calories": 210}	{Spinach,Banana,Apple,Spirulina,"Coconut Water"}	{None}	Large	None	f	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440004	550e8400-e29b-41d4-a716-446655440010	Citrus Energy Boost	Orange, grapefruit, and ginger juice blend	129.00	https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop	Beverages	{"Vitamin C","Energy Boost",Natural}	t	5	{"fat": 0, "carbs": 28, "fiber": 2, "protein": 2, "calories": 120}	{Orange,Grapefruit,Ginger,Mint}	{None}	Regular	None	f	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440005	550e8400-e29b-41d4-a716-446655440011	Caesar Supreme Salad	Crisp romaine lettuce with parmesan, croutons, and classic caesar dressing	249.00	https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop	Salads	{Keto-Friendly,High-Protein}	t	12	{"fat": 28, "carbs": 12, "fiber": 4, "protein": 22, "calories": 380}	{"Romaine Lettuce","Parmesan Cheese",Croutons,"Caesar Dressing","Chicken Breast"}	{Dairy,Gluten,Eggs}	Large	None	t	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440006	550e8400-e29b-41d4-a716-446655440011	Mediterranean Delight	Mixed greens with feta, olives, tomatoes, and olive oil dressing	279.00	https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop	Salads	{Mediterranean,Gluten-Free}	t	15	{"fat": 26, "carbs": 18, "fiber": 6, "protein": 12, "calories": 350}	{"Mixed Greens","Feta Cheese","Kalamata Olives","Cherry Tomatoes",Cucumber,"Red Onion","Olive Oil"}	{Dairy}	Large	None	t	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440007	550e8400-e29b-41d4-a716-446655440011	Quinoa Power Salad	Nutrient-dense quinoa with roasted vegetables and tahini dressing	299.00	https://images.unsplash.com/photo-1505576391880-b3f9d713dc4f?w=400&h=300&fit=crop	Salads	{Vegan,High-Protein,Superfood}	t	18	{"fat": 15, "carbs": 55, "fiber": 8, "protein": 16, "calories": 420}	{Quinoa,"Roasted Sweet Potato","Bell Peppers",Chickpeas,Spinach,Tahini,Lemon}	{Sesame}	Large	None	f	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440008	550e8400-e29b-41d4-a716-446655440012	Protein Power Smoothie	Banana, peanut butter, protein powder, and almond milk blend	199.00	https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=300&fit=crop	Smoothies	{High-Protein,Post-Workout}	t	7	{"fat": 14, "carbs": 35, "fiber": 5, "protein": 28, "calories": 390}	{Banana,"Peanut Butter","Whey Protein","Almond Milk",Honey}	{Nuts,Dairy}	Large	None	t	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440009	550e8400-e29b-41d4-a716-446655440012	Antioxidant Berry Blast	Mixed berries with acai and coconut water	179.00	https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop	Smoothies	{Antioxidant,Vegan,Superfood}	t	6	{"fat": 3, "carbs": 48, "fiber": 8, "protein": 4, "calories": 220}	{Blueberries,Strawberries,"Acai Powder","Coconut Water","Chia Seeds"}	{None}	Regular	None	t	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440010	550e8400-e29b-41d4-a716-446655440012	Cold Pressed Green Juice	Kale, celery, cucumber, apple, and lemon juice	149.00	https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&h=300&fit=crop	Beverages	{Detox,Cold-Pressed,"Vitamin Rich"}	t	8	{"fat": 1, "carbs": 38, "fiber": 6, "protein": 6, "calories": 180}	{Kale,Celery,Cucumber,"Green Apple",Lemon,Ginger}	{None}	Regular	None	f	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440011	550e8400-e29b-41d4-a716-446655440013	Balanced Buddha Bowl	Brown rice, grilled chicken, roasted vegetables, and tahini sauce	329.00	https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop	Bowls	{Balanced,High-Protein,"Complete Meal"}	t	20	{"fat": 22, "carbs": 48, "fiber": 8, "protein": 35, "calories": 520}	{"Brown Rice","Grilled Chicken",Broccoli,"Sweet Potato",Tahini,Spinach}	{Sesame}	Large	Mild	t	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440012	550e8400-e29b-41d4-a716-446655440013	Vegan Protein Bowl	Quinoa, black beans, avocado, and hemp seeds	289.00	https://images.unsplash.com/photo-1511909525232-61113c912358?w=400&h=300&fit=crop	Bowls	{Vegan,High-Protein,Plant-Based}	t	18	{"fat": 18, "carbs": 62, "fiber": 12, "protein": 22, "calories": 480}	{Quinoa,"Black Beans",Avocado,"Hemp Seeds","Bell Peppers",Lime}	{None}	Large	None	t	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440013	550e8400-e29b-41d4-a716-446655440013	Keto-Friendly Bowl	Cauliflower rice, grilled salmon, and avocado	369.00	https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop	Bowls	{Keto,Low-Carb,High-Fat}	t	22	{"fat": 32, "carbs": 8, "fiber": 6, "protein": 32, "calories": 450}	{"Cauliflower Rice","Grilled Salmon",Avocado,Spinach,"Olive Oil"}	{Fish}	Large	None	f	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440014	550e8400-e29b-41d4-a716-446655440014	Organic Garden Salad	Farm-fresh organic greens with seasonal vegetables	229.00	https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop	Salads	{Organic,Seasonal,Farm-Fresh}	t	12	{"fat": 6, "carbs": 24, "fiber": 8, "protein": 8, "calories": 180}	{"Organic Mixed Greens","Seasonal Vegetables","Organic Dressing"}	{None}	Regular	None	t	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440015	550e8400-e29b-41d4-a716-446655440014	Herbal Wellness Tea	Organic herbal tea blend for wellness	89.00	https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop	Beverages	{Organic,Wellness,Caffeine-Free}	t	5	{"fat": 0, "carbs": 1, "fiber": 0, "protein": 0, "calories": 5}	{"Organic Herbs",Chamomile,Mint}	{None}	Regular	None	f	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440016	550e8400-e29b-41d4-a716-446655440015	Express Chicken Bowl	Quick grilled chicken with rice and vegetables	199.00	https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&h=300&fit=crop	Bowls	{Quick,High-Protein,Office-Friendly}	t	10	{"fat": 12, "carbs": 45, "fiber": 4, "protein": 30, "calories": 420}	{"Grilled Chicken","Jasmine Rice","Mixed Vegetables"}	{None}	Regular	Mild	t	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440017	550e8400-e29b-41d4-a716-446655440016	Detox Green Juice	Cleansing green vegetable juice	159.00	https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&h=300&fit=crop	Beverages	{Detox,Cleansing,Cold-Pressed}	t	8	{"fat": 0, "carbs": 18, "fiber": 4, "protein": 4, "calories": 90}	{Kale,Spinach,Cucumber,Parsley,Lemon}	{None}	Regular	None	t	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440018	550e8400-e29b-41d4-a716-446655440017	Muscle Builder Bowl	High-protein bowl for fitness enthusiasts	319.00	https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop	Bowls	{High-Protein,Fitness,Muscle-Building}	t	15	{"fat": 20, "carbs": 50, "fiber": 6, "protein": 45, "calories": 600}	{"Chicken Breast","Brown Rice",Broccoli,"Sweet Potato","Protein Sauce"}	{Dairy}	Large	None	t	0	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
650e8400-e29b-41d4-a716-446655440002	550e8400-e29b-41d4-a716-446655440010	Berry Protein Bowl	Mixed berries with Greek yogurt, granola, and honey drizzle	219.00	https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&h=300&fit=crop	Bowls	{High-Protein,Probiotic}	t	10	{"fat": 8, "carbs": 45, "fiber": 6, "protein": 18, "calories": 320}	{"Mixed Berries","Greek Yogurt",Granola,Honey}	{Dairy,Nuts}	Regular	None	t	0	2025-09-13 20:16:24.304145+00	2025-09-14 12:01:27.001818+00
\.


--
-- Data for Name: subscription_deliveries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscription_deliveries (id, subscription_id, order_id, scheduled_date, delivery_status, delivered_at, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subscription_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscription_items (id, subscription_id, product_id, product_name, quantity, unit_price, created_at) FROM stdin;
\.


--
-- Data for Name: user_addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_addresses (id, user_id, type, label, street, area, landmark, full_address, city, state, country, postal_code, latitude, longitude, delivery_instructions, is_default, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, phone, name, email, verified, created_at, updated_at) FROM stdin;
5f999819-e608-48e8-9bb4-63274846ef32	+919944751745	Gowtham Sundaram	gowthamproductionpsgtech@gmail.com	t	2025-09-14 05:23:14.513+00	2025-09-14 05:23:14.539838+00
e0d398e9-4cca-43f5-b861-12df13599056	+919003802398	Mahalskahmi	maha@gmail.ni	t	2025-09-14 07:05:32.376+00	2025-09-14 07:05:32.397013+00
2717762d-f1f3-4099-8333-a03acbf828b2	+917397725100	Shankar	shankar3107@icloud.com	t	2025-09-20 12:05:53.867+00	2025-09-20 12:05:53.906152+00
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendors (id, name, description, image, rating, delivery_time, minimum_order, delivery_fee, cuisine_type, address, phone, is_active, is_featured, opening_hours, tags, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440010	The Fruit Bowl Co	Fresh, organic fruit bowls and smoothies made with locally sourced ingredients	https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&h=300&fit=crop	4.8	20-25 mins	199.00	0.00	Healthy Bowls	RS Puram, Coimbatore	+91 98765 43210	t	t	\N	{"Vegan Friendly",Organic,"Quick Delivery"}	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440011	Green Leaf Salads	Artisanal salads with premium greens and house-made dressings	https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop	4.7	25-30 mins	249.00	0.00	Salads & Greens	Gandhipuram, Coimbatore	+91 98765 43211	t	t	\N	{"Keto Friendly","Gluten Free","Fresh Daily"}	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440012	Smoothie Haven	Cold-pressed juices and protein smoothies for health enthusiasts	https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400&h=300&fit=crop	4.6	15-20 mins	149.00	0.00	Beverages	Peelamedu, Coimbatore	+91 98765 43212	t	t	\N	{"Protein Rich",Natural,"Energy Boost"}	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440013	Wholesome Kitchen	Complete meal solutions with balanced nutrition and taste	https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop	4.9	30-35 mins	299.00	0.00	Balanced Meals	Saibaba Colony, Coimbatore	+91 98765 43213	t	f	\N	{"Balanced Nutrition","High Protein","Family Meals"}	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440014	Pure Greens Cafe	Farm-to-table organic meals with sustainable practices	https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop	4.5	25-30 mins	199.00	0.00	Organic Cafe	Race Course, Coimbatore	+91 98765 43214	t	f	\N	{Organic,Sustainable,"Farm Fresh"}	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440015	Nutri Bowl Express	Quick healthy bowls for busy professionals	https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&h=300&fit=crop	4.4	18-22 mins	179.00	0.00	Quick Bowls	Singanallur, Coimbatore	+91 98765 43215	t	f	\N	{"Quick Service","Office Friendly",Nutritious}	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440016	Detox & Delight	Cleansing juices and detox meal plans	https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=400&h=300&fit=crop	4.3	20-25 mins	229.00	0.00	Detox Specialists	Vadavalli, Coimbatore	+91 98765 43216	t	f	\N	{Detox,Cleansing,Wellness}	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
550e8400-e29b-41d4-a716-446655440017	Protein Power House	High-protein meals for fitness enthusiasts	https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop	4.6	25-30 mins	249.00	0.00	Fitness Meals	Hopes College, Coimbatore	+91 98765 43217	t	f	\N	{"High Protein",Fitness,"Muscle Building"}	2025-09-13 20:16:24.304145+00	2025-09-13 20:16:24.304145+00
\.


--
-- Name: cart cart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_pkey PRIMARY KEY (id);


--
-- Name: cart cart_user_phone_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT cart_user_phone_product_id_key UNIQUE (user_phone, product_id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: kv_store_6985f4e9 kv_store_6985f4e9_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kv_store_6985f4e9
    ADD CONSTRAINT kv_store_6985f4e9_pkey PRIMARY KEY (key);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: otp_verification otp_verification_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_verification
    ADD CONSTRAINT otp_verification_phone_key UNIQUE (phone);


--
-- Name: otp_verification otp_verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_verification
    ADD CONSTRAINT otp_verification_pkey PRIMARY KEY (id);


--
-- Name: product_subscriptions product_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_subscriptions
    ADD CONSTRAINT product_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: subscription_deliveries subscription_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_deliveries
    ADD CONSTRAINT subscription_deliveries_pkey PRIMARY KEY (id);


--
-- Name: subscription_items subscription_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_items
    ADD CONSTRAINT subscription_items_pkey PRIMARY KEY (id);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: idx_cart_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_created_at ON public.cart USING btree (created_at);


--
-- Name: idx_cart_user_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_user_phone ON public.cart USING btree (user_phone);


--
-- Name: idx_cart_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_vendor_id ON public.cart USING btree (vendor_id);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_orders_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_vendor_id ON public.orders USING btree (vendor_id);


--
-- Name: idx_otp_verification_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_verification_expires ON public.otp_verification USING btree (expires_at);


--
-- Name: idx_otp_verification_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_verification_phone ON public.otp_verification USING btree (phone);


--
-- Name: idx_products_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_available ON public.products USING btree (is_available);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_featured ON public.products USING btree (vendor_id, is_featured);


--
-- Name: idx_products_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_vendor_id ON public.products USING btree (vendor_id);


--
-- Name: idx_subscriptions_active_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_active_dates ON public.product_subscriptions USING btree (start_date, end_date) WHERE (status = 'active'::text);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.product_subscriptions USING btree (status);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.product_subscriptions USING btree (user_id);


--
-- Name: idx_subscriptions_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_vendor_id ON public.product_subscriptions USING btree (vendor_id);


--
-- Name: idx_user_addresses_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_addresses_default ON public.user_addresses USING btree (is_default) WHERE (is_default = true);


--
-- Name: idx_user_addresses_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_addresses_type ON public.user_addresses USING btree (type);


--
-- Name: idx_user_addresses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_addresses_user_id ON public.user_addresses USING btree (user_id);


--
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone);


--
-- Name: idx_users_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_verified ON public.users USING btree (verified);


--
-- Name: idx_vendors_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_active ON public.vendors USING btree (is_active);


--
-- Name: idx_vendors_cuisine; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_cuisine ON public.vendors USING btree (cuisine_type);


--
-- Name: idx_vendors_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_featured ON public.vendors USING btree (is_featured);


--
-- Name: kv_store_6985f4e9_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx1 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx10; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx10 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx11; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx11 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx12; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx12 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx13; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx13 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx14; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx14 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx15; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx15 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx16; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx16 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx17; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx17 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx18; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx18 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx2 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx3 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx4 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx5 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx6 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx7 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx8 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: kv_store_6985f4e9_key_idx9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kv_store_6985f4e9_key_idx9 ON public.kv_store_6985f4e9 USING btree (key text_pattern_ops);


--
-- Name: cart cart_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER cart_updated_at_trigger BEFORE UPDATE ON public.cart FOR EACH ROW EXECUTE FUNCTION public.update_cart_updated_at();


--
-- Name: user_addresses ensure_single_default_address_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_single_default_address_trigger BEFORE INSERT OR UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_address();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription_deliveries update_subscription_deliveries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscription_deliveries_updated_at BEFORE UPDATE ON public.subscription_deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.product_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_addresses update_user_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendors update_vendors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart fk_cart_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart fk_cart_vendor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT fk_cart_vendor FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: order_items order_items_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: orders orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: product_subscriptions product_subscriptions_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_subscriptions
    ADD CONSTRAINT product_subscriptions_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: products products_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: subscription_deliveries subscription_deliveries_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_deliveries
    ADD CONSTRAINT subscription_deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: subscription_deliveries subscription_deliveries_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_deliveries
    ADD CONSTRAINT subscription_deliveries_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.product_subscriptions(id) ON DELETE CASCADE;


--
-- Name: subscription_items subscription_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_items
    ADD CONSTRAINT subscription_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: subscription_items subscription_items_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_items
    ADD CONSTRAINT subscription_items_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.product_subscriptions(id) ON DELETE CASCADE;


--
-- Name: user_addresses user_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vendors Public can view active vendors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active vendors" ON public.vendors FOR SELECT USING ((is_active = true));


--
-- Name: products Public can view available products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view available products" ON public.products FOR SELECT USING ((is_available = true));


--
-- Name: categories Public can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING ((is_active = true));


--
-- Name: cart Service role can access all cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can access all cart items" ON public.cart USING ((auth.role() = 'service_role'::text));


--
-- Name: otp_verification Service role can manage OTP records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage OTP records" ON public.otp_verification USING ((auth.role() = 'service_role'::text));


--
-- Name: users Service role can manage users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage users" ON public.users USING ((auth.role() = 'service_role'::text));


--
-- Name: orders Users can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (((auth.uid())::text = (user_id)::text));


--
-- Name: user_addresses Users can delete own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own addresses" ON public.user_addresses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_addresses Users can insert own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own addresses" ON public.user_addresses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: product_subscriptions Users can manage own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own subscriptions" ON public.product_subscriptions USING (((auth.uid())::text = (user_id)::text));


--
-- Name: cart Users can manage their own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own cart items" ON public.cart USING (((user_phone)::text = current_setting('app.current_user_phone'::text, true)));


--
-- Name: user_addresses Users can update own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own addresses" ON public.user_addresses FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_addresses Users can view own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own addresses" ON public.user_addresses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: order_items Users can view own order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND ((orders.user_id)::text = (auth.uid())::text)))));


--
-- Name: orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (((auth.uid())::text = (user_id)::text));


--
-- Name: subscription_items Users can view own subscription items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscription items" ON public.subscription_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.product_subscriptions
  WHERE ((product_subscriptions.id = subscription_items.subscription_id) AND ((product_subscriptions.user_id)::text = (auth.uid())::text)))));


--
-- Name: cart; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;

--
-- Name: kv_store_6985f4e9; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kv_store_6985f4e9 ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: otp_verification; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.otp_verification ENABLE ROW LEVEL SECURITY;

--
-- Name: product_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;

--
-- Name: user_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict dJZEcdavjfq1t0PAiRsCB7vPDMDthKhQqE6TRhxB2qrXHtzzba9vRyVfXyVWWfJ

