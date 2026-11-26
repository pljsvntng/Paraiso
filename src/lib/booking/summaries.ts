// A cart may contain unrelated participants. Never infer unique people from item maxima or sums.
export const summaryColumns = `COALESCE((SELECT string_agg(i.name||': '||i.adult_count||' adults, '||i.child_count||' children','; ' ORDER BY i.check_in_date,i.name) FROM booking_items i WHERE i.booking_id=b.id),b.adult_count||' adults, '||b.child_count||' children') guest_summary,
COALESCE((SELECT string_agg(DISTINCT i.category,', ' ORDER BY i.category) FROM booking_items i WHERE i.booking_id=b.id),b.booking_category) service_categories`;
