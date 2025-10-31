import { z } from 'zod';

// Esquema de validación para Zod
export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  // Convierte el string del input a number antes de validar
  price: z.coerce.number().positive('El precio debe ser positivo'),
  stock: z.coerce.number().int('El stock debe ser un número entero').min(0, 'El stock no puede ser negativo'),
});

// El tipo inferido (ProductFormData) ahora será { name: string; price: number; stock: number; }
// y coincidirá con lo que espera onCreateProduct.
export type ProductFormData = z.infer<typeof productSchema>;


// Tipo del producto que viene de la API 
export interface Product extends ProductFormData {
  id: number;
}
