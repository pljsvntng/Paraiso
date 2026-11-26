CREATE TABLE booking_item_addons (
 item_id uuid NOT NULL REFERENCES booking_items(id) ON DELETE CASCADE,
 addon_id uuid NOT NULL REFERENCES addons(id), name text NOT NULL, price_centavos bigint CHECK(price_centavos>=0),
 PRIMARY KEY(item_id,addon_id)
);
