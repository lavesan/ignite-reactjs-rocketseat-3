import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

const CARD_INFO_STORAGE = "@RocketShoes:cart";

const setCartStorage = (cart: Product[]) => {
  localStorage.setItem(CARD_INFO_STORAGE, JSON.stringify(cart));
};

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(CARD_INFO_STORAGE);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = await api
        .get<Product>(`/products/${productId}`)
        .then((res) => res.data)
        .catch((_) => {
          throw new Error("Erro na adição do produto");
        });
      const stock = await api
        .get<Stock>(`/stock/${productId}`)
        .then((res) => res.data)
        .catch((_) => {
          throw new Error("Quantidade solicitada fora de estoque");
        });

      let productsData = cart;
      const productExistsIndex = productsData.findIndex(
        (product) => product.id === productId
      );
      const productIsOnCart = productExistsIndex >= 0;

      if (
        productIsOnCart &&
        stock.amount > productsData[productExistsIndex].amount
      ) {
        productsData = productsData.map((product, index) => {
          return product.id === productId
            ? { ...product, amount: product.amount + 1 }
            : product;
        });
      } else if (!productIsOnCart && stock.amount >= 1) {
        const newProduct = {
          ...product,
          amount: 1,
        };

        productsData = [...productsData, newProduct];
      } else {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      setCartStorage(productsData);
      setCart(productsData);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.some(product => product.id === productId)) {
        throw new Error('Erro na remoção do produto')
      }
      const productsData = cart.filter(
        (product) => product.id !== productId
      );
      setCartStorage(productsData);
      setCart(productsData);
    } catch(err: any) {
      toast.error(err.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (!cart.some(product => product.id === productId)) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const stock = await api
        .get<Stock>(`/stock/${productId}`)
        .then((res) => res.data);

      if (amount < 1) return;

      if (stock.amount >= amount) {
        setCart((products) => {
          const productsData = products.map((product) =>
            product.id === productId ? { ...product, amount } : product
          );
          setCartStorage(productsData);
          return productsData;
        });
      } else {
        throw new Error("Quantidade solicitada fora de estoque");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
