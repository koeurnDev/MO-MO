/**
 * Utility to calculate best discount for a product
 */
export const calculateBestDiscount = (product, activeDiscounts = []) => {
    if (!product || !activeDiscounts.length) return null;

    const relevant = activeDiscounts.filter(d => 
        d.apply_to === 'all' || (d.product_ids && d.product_ids.includes(product.id))
    );
    
    if (!relevant.length) return null;

    // Sort to find the best discount (highest value)
    return relevant.sort((a, b) => {
        const valA = a.discount_type === 'percent' ? (product.price * a.value / 100) : a.value;
        const valB = b.discount_type === 'percent' ? (product.price * b.value / 100) : b.value;
        return valB - valA;
    })[0];
};

export const getDiscountedPrice = (product, bestDiscount) => {
    if (!bestDiscount) return product.price;
    const price = bestDiscount.discount_type === 'percent' 
        ? (product.price * (1 - bestDiscount.value / 100)) 
        : Math.max(0, product.price - bestDiscount.value);
    return parseFloat(price.toFixed(2));
};
