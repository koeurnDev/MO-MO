import React, { useState, useMemo } from 'react';
import { useCartState, useCartDispatch } from '../context/CartContext';
import { useShopState, useShopDispatch } from '../context/ShopContext';
import { useUserState } from '../context/UserContext';
import { useTelegram } from '../context/TelegramContext';
import { calculateBestDiscount, getDiscountedPrice } from '../utils/discountUtils';
import DeliveryForm from './DeliveryForm';

const CartPage = ({
  formData, setFormData, onPhoneChange, isPhoneValid, isAddressValid,
  validationErrors = {}, onCheckout, isPlacingOrder = false
}) => {
  const { cart, totalPrice, totalItemsCount } = useCartState();
  const { updateQty, clearCart } = useCartDispatch();
  const { activeDiscounts, deliveryThreshold, deliveryFee } = useShopState();
  const { setView } = useShopDispatch();
  const { t, lang, user } = useUserState();
  const { tg } = useTelegram();

  const [step, setStep] = useState(1); // 1: Review, 2: Info/Payment
  const threshold = parseFloat(deliveryThreshold) || 50;
  const fee = parseFloat(deliveryFee) || 0;

  const totalDiscount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const relevant = activeDiscounts.filter(d => d.apply_to === 'all' || (d.product_ids && d.product_ids.includes(item.id)));
      if (relevant.length === 0) return sum;

      const best = relevant.sort((a, b) => {
        const valA = a.discount_type === 'percent' ? (item.price * a.value / 100) : a.value;
        const valB = b.discount_type === 'percent' ? (item.price * b.value / 100) : b.value;
        return valB - valA;
      })[0];

      const itemDiscount = best.discount_type === 'percent'
        ? (item.price * (best.value / 100))
        : Math.min(item.price, best.value);

      return sum + (itemDiscount * item.quantity);
    }, 0);
  }, [cart, activeDiscounts]);

  const subTotal = Math.max(0, totalPrice - totalDiscount);
  const isFreeDelivery = subTotal >= threshold;
  const appliedFee = isFreeDelivery ? 0 : fee;
  const finalTotal = subTotal + appliedFee;

  const handleBack = () => {
    if (step === 2) setStep(1);
    else setView('home');
  };

  const handlePrimaryAction = () => {
    if (step === 1) {
      setStep(2);
      window.scrollTo(0, 0);
    } else {
      if (!isPlacingOrder && isPhoneValid && isAddressValid) {
        onCheckout(finalTotal);
      } else if (!isPhoneValid || !isAddressValid) {
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  if (totalItemsCount === 0) {
    return (
      <main className="checkout-section animate-in p-5">
        <div className="flex items-center gap-4 mb-8">
          <button className="w-10 h-10 flex items-center justify-center glass-effect rounded-full" onClick={() => setView('home')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h2 className="text-xl font-black text-bold">{t('cart_title')}</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <div className="text-6xl mb-4">🛍️</div>
          <p className="text-lg font-bold">{t('empty_cart')}</p>
          <button className="mt-8 px-8 py-3 bg-primary-accent text-white font-black rounded-full shadow-lg" onClick={() => setView('home')}>
            {t('order_now')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-section animate-in p-5">
      <div className="flex items-center gap-4 mb-8">
        <button className="w-10 h-10 flex items-center justify-center glass-effect rounded-full" onClick={handleBack} aria-label={t('back')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h2 className="text-xl font-black text-bold">{step === 1 ? t('cart_title') : t('checkout')}</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          {step === 1 ? (
            <div className="animate-in mb-8">
              <h3 className="text-lg font-black text-bold mb-4">{t('items')} ({totalItemsCount})</h3>
              <div className="flex flex-col gap-4">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-4 p-4 bg-bg-surface rounded-3xl shadow-sm border border-border-subtle">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-bg-soft">
                      <img
                        src={item.image.includes('cloudinary') ? item.image.replace('upload/', 'upload/f_auto,q_auto,w_100/') : item.image}
                        alt="" className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-bold line-clamp-1">{item.name}</div>
                        <div className="font-black text-bold">${(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3 bg-bg-soft rounded-xl px-2 py-1">
                          <button className="w-6 h-6 flex items-center justify-center font-black" onClick={() => updateQty(item.id, -1)}>−</button>
                          <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                          <button className="w-6 h-6 flex items-center justify-center font-black" onClick={() => updateQty(item.id, 1)}>+</button>
                        </div>
                        <button className="text-[10px] font-black uppercase text-rose-500 tracking-wider" onClick={() => updateQty(item.id, -item.quantity)}>
                          {t('remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="animate-in">
              <DeliveryForm
                user={user} formData={formData}
                onPhoneChange={onPhoneChange} setFormData={setFormData}
                t={t} lang={lang} validationErrors={validationErrors}
              />
              <div className="mt-8 p-6 bg-bg-surface rounded-3xl border border-border-subtle shadow-sm">
                <h3 className="text-lg font-black text-bold mb-4">{t('paid_by')}</h3>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary-accent/5 border-2 border-primary-accent shadow-sm">
                  <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm overflow-hidden">
                    <img src="Bakong.png" alt="Bakong" className="max-w-[70%]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-bold">Bakong KHQR</div>
                    <div className="text-[10px] font-bold text-muted">{lang === 'kh' ? 'ទូទាត់បានគ្រប់ធានាគាទាំងអស់' : 'Compatible with all banks'}</div>
                  </div>
                  <div className="w-6 h-6 flex items-center justify-center bg-primary-accent text-white rounded-full">✓</div>
                </div>
                <div className="mt-4 text-[10px] font-black text-rose-500 text-center opacity-75">
                  {lang === 'kh' ? '* រាល់ការបង់ប្រាក់រួចហើយមិនអាចដកវិញទេ' : '* All payments are non-refundable.'}
                </div>
              </div>
              <button className="mt-6 flex items-center gap-2 text-xs font-black uppercase text-muted tracking-widest" onClick={() => setStep(1)}>
                ← {t('edit_cart')}
              </button>
            </div>
          )}
        </div>

        <div className="lg:w-80">
          <div className="sticky top-5 p-6 bg-bg-surface rounded-3xl border border-border-subtle shadow-lg">
            <h3 className="text-lg font-black text-bold mb-6">{t('summary')}</h3>
            <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-dashed border-border-subtle">
              {cart.map(item => {
                const best = calculateBestDiscount(item, activeDiscounts);
                const dPrice = best ? getDiscountedPrice(item, best) : null;
                return (
                  <div key={item.id} className="flex justify-between items-baseline text-sm">
                <div className="text-bold font-bold truncate max-w-[140px] tracking-tight">{item.name} x {item.quantity}</div>
                <div className="font-black text-bold tabular-nums">
                  {dPrice ? `$${(dPrice * item.quantity).toFixed(2)}` : `$${(item.price * item.quantity).toFixed(2)}`}
                </div>
              </div>
            );
          })}
          <div className="flex justify-between items-center text-sm">
            <div className="text-bold font-bold uppercase tracking-tight">{t('delivery_label')}</div>
            <div className="font-black text-bold tabular-nums">${appliedFee.toFixed(2)}</div>
          </div>
        </div>
        <div className="flex justify-between items-center mb-8">
          <span className="text-lg font-black uppercase text-bold">{lang === 'kh' ? 'សរុប:' : 'Total:'}</span>
          <span className="text-2xl font-black text-primary-accent tabular-nums">${finalTotal.toFixed(2)}</span>
        </div>
        <button
          className={`w-full py-4 flex items-center justify-center gap-3 bg-primary-accent text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all ${isPlacingOrder ? 'opacity-75 cursor-wait' : 'hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]'} ${(step === 2 && (!isPhoneValid || !isAddressValid)) ? 'opacity-50 grayscale' : ''}`}
          onClick={handlePrimaryAction}
          disabled={isPlacingOrder || totalItemsCount === 0}
        >
              {isPlacingOrder ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : step === 1 ? (
                <>
                  <span>{t('next')}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </>
              ) : (
                <>
                  <span>{t('order_now')}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CartPage;
