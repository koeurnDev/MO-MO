import React from 'react';
import { TelegramProvider } from './TelegramContext';
import { UserProvider } from './UserContext';
import { ShopProvider } from './ShopContext';
import { CartProvider } from './CartContext';
import { FeatureFlagProvider } from './FeatureFlagContext';

export const AppProvider = ({ children }) => {
  return (
    <TelegramProvider>
      <UserProvider>
        <FeatureFlagProvider>
          <ShopProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </ShopProvider>
        </FeatureFlagProvider>
      </UserProvider>
    </TelegramProvider>
  );
};
