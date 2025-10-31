import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../lib/axios';
import { productSchema } from '../types/product.types';
import type { Product } from '../types/product.types';
import type { ProductFormData } from '../types/product.types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

// --- Componente para la Fila de Edición de Stock ---
// (Lo creamos para manejar su propio estado de input)
interface StockEditRowProps {
  product: Product;
  onSave: (id: number, newStock: number) => Promise<void>;
  onCancel: () => void;
}

const StockEditRow: React.FC<StockEditRowProps> = ({ product, onSave, onCancel }) => {
  const [stock, setStock] = useState(product.stock);

  const handleSave = () => {
    if (isNaN(stock) || stock < 0) {
      toast.error('Valor de stock inválido');
      return;
    }
    onSave(product.id, stock);
  };

  return (
    <tr data-testid={`edit-row-${product.id}`}>
      <td>{product.id}</td>
      <td>{product.name}</td>
      <td>${product.price.toFixed(2)}</td>
      <td>
        {/* Usamos un "spinbutton" (input type number) para la accesibilidad */}
        <input
          type="number"
          value={stock}
          onChange={(e) => setStock(parseInt(e.target.value, 10))}
          aria-label={`Stock para ${product.name}`}
          style={{ width: '60px' }}
        />
      </td>
      <td>
        <button onClick={handleSave}>Confirmar</button>
        <button onClick={onCancel}>Cancelar</button>
      </td>
    </tr>
  );
};

// --- Componente Principal de la Página ---
export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuthStore();

  // Nuevo estado para saber qué fila estamos editando
  const [editingStockId, setEditingStockId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  // --- Cargar Productos (GET) ---
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get<Product[]>('/api/products');
      setProducts(response.data);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        toast.error('Error al cargar productos');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // --- Crear Producto (POST) ---
  const onCreateProduct = async (data: ProductFormData) => {
    try {
      await api.post('/api/products', data);
      toast.success('Producto creado');
      reset();
      fetchProducts(); // Refresca la lista
    } catch (err) {
      toast.error('Error al crear producto');
    }
  };

  // --- Actualizar Stock (PATCH) ---
  // Esta función AHORA la llamará el componente StockEditRow
  const handleUpdateStock = async (id: number, newStock: number) => {
    const loadingToast = toast.loading('Actualizando...');
    try {
      await api.patch(`/api/products/${id}`, {
        stock: newStock,
      });
      toast.success('Stock actualizado', { id: loadingToast });
      setEditingStockId(null); // Salimos del modo edición
      fetchProducts(); // Refresca la lista
    } catch (err) {
      toast.error('Error al actualizar', { id: loadingToast });
    }
  };

  // --- Renderizado ---
  if (loading) return <p>Cargando...</p>;

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={logout} style={{ float: 'right' }}>
        Cerrar Sesión
      </button>
      <h2>Gestión de Productos</h2>

      {/* 1. Formulario de Creación (Sin cambios) */}
      <form
        onSubmit={handleSubmit(onCreateProduct)}
        style={{
          border: '1px solid #ccc',
          padding: '15px',
          marginBottom: '20px',
        }}
      >
        <h3>Crear Producto</h3>
        {/* ... (inputs de name, price, stock) ... */}
        {/* (Omitido por brevedad, es igual que antes) */}
         <div>
          <label>Nombre: </label>
          <input {...register('name')} />
          {errors.name && <p style={{ color: 'red', margin: 0 }}>{errors.name.message}</p>}
        </div>
        <div>
          <label>Precio: </label>
          <input type="number" step="0.01" {...register('price')} />
          {errors.price && <p style={{ color: 'red', margin: 0 }}>{errors.price.message}</p>}
        </div>
        <div>
          <label>Stock: </label>
          <input type="number" {...register('stock')} />
          {errors.stock && <p style={{ color: 'red', margin: 0 }}>{errors.stock.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Crear Producto'}
        </button>
      </form>

      {/* 2. Listado de Productos (Ahora con lógica de edición) */}
      <h3>Listado</h3>
      <table
        border={1}
        cellPadding={5}
        style={{ width: '100%', borderCollapse: 'collapse' }}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) =>
            // Renderizado condicional:
            // ¿Estamos editando esta fila?
            editingStockId === p.id ? (
              // SÍ: Muestra la fila de edición
              <StockEditRow
                key={p.id}
                product={p}
                onSave={handleUpdateStock}
                onCancel={() => setEditingStockId(null)}
              />
            ) : (
              // NO: Muestra la fila normal
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>${p.price.toFixed(2)}</td>
                <td>{p.stock}</td>
                <td>
                  <button onClick={() => setEditingStockId(p.id)}>
                    Actualizar Stock
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};