


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."address_type" AS ENUM (
    'home',
    'work',
    'other'
);


ALTER TYPE "public"."address_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_default_address"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."ensure_single_default_address"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_default_address"("input_user_id" "uuid") RETURNS TABLE("id" "uuid", "type" character varying, "custom_tag" character varying, "house_number" character varying, "apartment_road" character varying, "complete_address" "text", "latitude" numeric, "longitude" numeric, "phone" character varying, "display_type" "text", "short_address" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_user_default_address"("input_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cart_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_cart_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_addresses_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_addresses_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_otp_verification"("p_phone" "text", "p_otp" "text", "p_expires_at" timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."upsert_otp_verification"("p_phone" "text", "p_otp" "text", "p_expires_at" timestamp with time zone) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cart" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_phone" character varying(15) NOT NULL,
    "product_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_quantity_positive" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."cart" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "icon_name" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kv_store_6985f4e9" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_6985f4e9" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "product_id" "uuid",
    "vendor_id" "uuid",
    "product_name" "text" NOT NULL,
    "product_description" "text",
    "product_image_url" "text",
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "special_instructions" "text",
    "customizations" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "vendor_id" "uuid",
    "order_number" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "order_type" "text" DEFAULT 'instant'::"text" NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "delivery_fee" numeric(10,2) DEFAULT 0,
    "packaging_fee" numeric(10,2) DEFAULT 5,
    "taxes" numeric(10,2) DEFAULT 0,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "total_amount" numeric(10,2) NOT NULL,
    "delivery_address" "jsonb" NOT NULL,
    "delivery_phone" "text",
    "estimated_delivery_time" timestamp with time zone,
    "actual_delivery_time" timestamp with time zone,
    "payment_id" "text",
    "payment_method" "text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "special_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."otp_verification" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
    "otp" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "verified" boolean DEFAULT false,
    "attempts" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "verified_at" timestamp with time zone
);


ALTER TABLE "public"."otp_verification" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "vendor_id" "uuid",
    "subscription_name" "text" NOT NULL,
    "frequency" "text" NOT NULL,
    "duration_weeks" integer NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "amount_per_delivery" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "delivery_time" "text",
    "delivery_days" integer[],
    "delivery_address" "jsonb" NOT NULL,
    "payment_id" "text",
    "payment_method" "text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "image_url" "text",
    "category" "text" NOT NULL,
    "tags" "text"[],
    "is_available" boolean DEFAULT true,
    "preparation_time" integer DEFAULT 15,
    "nutritional_info" "jsonb",
    "ingredients" "text"[],
    "allergens" "text"[],
    "portion_size" "text",
    "spice_level" "text",
    "is_featured" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid",
    "order_id" "uuid",
    "scheduled_date" "date" NOT NULL,
    "delivery_status" "text" DEFAULT 'scheduled'::"text",
    "delivered_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid",
    "product_id" "uuid",
    "product_name" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_addresses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."address_type" NOT NULL,
    "label" character varying(50),
    "street" character varying(200) NOT NULL,
    "area" character varying(100),
    "landmark" character varying(15),
    "full_address" "text" NOT NULL,
    "city" character varying(50) DEFAULT 'Coimbra'::character varying NOT NULL,
    "state" character varying(50) DEFAULT 'Coimbra'::character varying NOT NULL,
    "country" character varying(50) DEFAULT 'Portugal'::character varying NOT NULL,
    "postal_code" character varying(10),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "delivery_instructions" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
    "name" "text",
    "email" "text",
    "verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image" "text",
    "rating" numeric(2,1) DEFAULT 4.5,
    "delivery_time" "text" DEFAULT '25-30 mins'::"text",
    "minimum_order" numeric(10,2) DEFAULT 0,
    "delivery_fee" numeric(10,2) DEFAULT 0,
    "cuisine_type" "text",
    "address" "text",
    "phone" "text",
    "is_active" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "opening_hours" "jsonb",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vendors" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cart"
    ADD CONSTRAINT "cart_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart"
    ADD CONSTRAINT "cart_user_phone_product_id_key" UNIQUE ("user_phone", "product_id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kv_store_6985f4e9"
    ADD CONSTRAINT "kv_store_6985f4e9_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."otp_verification"
    ADD CONSTRAINT "otp_verification_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."otp_verification"
    ADD CONSTRAINT "otp_verification_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_subscriptions"
    ADD CONSTRAINT "product_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_deliveries"
    ADD CONSTRAINT "subscription_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_items"
    ADD CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_cart_created_at" ON "public"."cart" USING "btree" ("created_at");



CREATE INDEX "idx_cart_user_phone" ON "public"."cart" USING "btree" ("user_phone");



CREATE INDEX "idx_cart_vendor_id" ON "public"."cart" USING "btree" ("vendor_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_orders_vendor_id" ON "public"."orders" USING "btree" ("vendor_id");



CREATE INDEX "idx_otp_verification_expires" ON "public"."otp_verification" USING "btree" ("expires_at");



CREATE INDEX "idx_otp_verification_phone" ON "public"."otp_verification" USING "btree" ("phone");



CREATE INDEX "idx_products_available" ON "public"."products" USING "btree" ("is_available");



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category");



CREATE INDEX "idx_products_featured" ON "public"."products" USING "btree" ("vendor_id", "is_featured");



CREATE INDEX "idx_products_vendor_id" ON "public"."products" USING "btree" ("vendor_id");



CREATE INDEX "idx_subscriptions_active_dates" ON "public"."product_subscriptions" USING "btree" ("start_date", "end_date") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_subscriptions_status" ON "public"."product_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_user_id" ON "public"."product_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_vendor_id" ON "public"."product_subscriptions" USING "btree" ("vendor_id");



CREATE INDEX "idx_user_addresses_default" ON "public"."user_addresses" USING "btree" ("is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_user_addresses_type" ON "public"."user_addresses" USING "btree" ("type");



CREATE INDEX "idx_user_addresses_user_id" ON "public"."user_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_users_phone" ON "public"."users" USING "btree" ("phone");



CREATE INDEX "idx_users_verified" ON "public"."users" USING "btree" ("verified");



CREATE INDEX "idx_vendors_active" ON "public"."vendors" USING "btree" ("is_active");



CREATE INDEX "idx_vendors_cuisine" ON "public"."vendors" USING "btree" ("cuisine_type");



CREATE INDEX "idx_vendors_featured" ON "public"."vendors" USING "btree" ("is_featured");



CREATE INDEX "kv_store_6985f4e9_key_idx" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx1" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx10" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx11" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx12" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx13" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx14" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx15" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx16" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx17" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx18" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx2" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx3" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx4" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx5" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx6" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx7" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx8" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_6985f4e9_key_idx9" ON "public"."kv_store_6985f4e9" USING "btree" ("key" "text_pattern_ops");



CREATE OR REPLACE TRIGGER "cart_updated_at_trigger" BEFORE UPDATE ON "public"."cart" FOR EACH ROW EXECUTE FUNCTION "public"."update_cart_updated_at"();



CREATE OR REPLACE TRIGGER "ensure_single_default_address_trigger" BEFORE INSERT OR UPDATE ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_default_address"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscription_deliveries_updated_at" BEFORE UPDATE ON "public"."subscription_deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."product_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_addresses_updated_at" BEFORE UPDATE ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vendors_updated_at" BEFORE UPDATE ON "public"."vendors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."cart"
    ADD CONSTRAINT "fk_cart_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart"
    ADD CONSTRAINT "fk_cart_vendor" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."product_subscriptions"
    ADD CONSTRAINT "product_subscriptions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_deliveries"
    ADD CONSTRAINT "subscription_deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."subscription_deliveries"
    ADD CONSTRAINT "subscription_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."product_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_items"
    ADD CONSTRAINT "subscription_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."subscription_items"
    ADD CONSTRAINT "subscription_items_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."product_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Public can view active vendors" ON "public"."vendors" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view available products" ON "public"."products" FOR SELECT USING (("is_available" = true));



CREATE POLICY "Public can view categories" ON "public"."categories" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Service role can access all cart items" ON "public"."cart" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage OTP records" ON "public"."otp_verification" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage users" ON "public"."users" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create orders" ON "public"."orders" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can delete own addresses" ON "public"."user_addresses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own addresses" ON "public"."user_addresses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own subscriptions" ON "public"."product_subscriptions" USING ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can manage their own cart items" ON "public"."cart" USING ((("user_phone")::"text" = "current_setting"('app.current_user_phone'::"text", true)));



CREATE POLICY "Users can update own addresses" ON "public"."user_addresses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own addresses" ON "public"."user_addresses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND (("orders"."user_id")::"text" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can view own orders" ON "public"."orders" FOR SELECT USING ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can view own subscription items" ON "public"."subscription_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."product_subscriptions"
  WHERE (("product_subscriptions"."id" = "subscription_items"."subscription_id") AND (("product_subscriptions"."user_id")::"text" = ("auth"."uid"())::"text")))));



ALTER TABLE "public"."cart" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kv_store_6985f4e9" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."otp_verification" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."ensure_single_default_address"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_address"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_address"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_default_address"("input_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_default_address"("input_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_default_address"("input_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cart_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cart_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cart_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_addresses_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_addresses_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_addresses_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_otp_verification"("p_phone" "text", "p_otp" "text", "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_otp_verification"("p_phone" "text", "p_otp" "text", "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_otp_verification"("p_phone" "text", "p_otp" "text", "p_expires_at" timestamp with time zone) TO "service_role";


















GRANT ALL ON TABLE "public"."cart" TO "anon";
GRANT ALL ON TABLE "public"."cart" TO "authenticated";
GRANT ALL ON TABLE "public"."cart" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."kv_store_6985f4e9" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_6985f4e9" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_6985f4e9" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."otp_verification" TO "anon";
GRANT ALL ON TABLE "public"."otp_verification" TO "authenticated";
GRANT ALL ON TABLE "public"."otp_verification" TO "service_role";



GRANT ALL ON TABLE "public"."product_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."product_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."product_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."subscription_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_items" TO "anon";
GRANT ALL ON TABLE "public"."subscription_items" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_items" TO "service_role";



GRANT ALL ON TABLE "public"."user_addresses" TO "anon";
GRANT ALL ON TABLE "public"."user_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;

