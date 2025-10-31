import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { api } from '../lib/axios';


type LoginFormInputs = {
  email: string;
  password: string;
};

export const LoginPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormInputs>();
  const setToken = useAuthStore((state) => state.setToken);
  const navigate = useNavigate();

  const onSubmit = async (data: LoginFormInputs) => {
    console.log(data);
    try {
      // ¡Llamada real a la API!
      // Usamos la instancia 'api' que ya tiene el baseURL 'http://localhost:8080'
      const response = await api.post('/login', data); 
      debugger;
      console.log(response.data);
      
      const token = response.data.accessToken;
      if (!token) {
        throw new Error('No se recibió token');
      }

      // Guardamos el token en Zustand (y localStorage)
      setToken(token);
      toast.success('¡Login exitoso!');
      
      // Redirigimos a la página de productos
      navigate('/products');

    } catch (err: any) {
      console.error(err);
      console.log(err.response);
      if (err.response?.status === 400) {
        toast.error('Email o contraseña incorrectos.');
      } else {
        toast.error('Error al iniciar sesión.');
      }
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h2>Login</h2>
      <p>Usar las credenciales del archivo db.json:</p>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          {...register('email', { required: 'Email es requerido' })} 
          placeholder="Email"
        />
        {errors.email && <span style={{color: 'red'}}>{errors.email.message}</span>}
        
        <input 
          type="password"
          {...register('password', { required: 'Contraseña es requerida' })} 
          placeholder="Password"
        />
        {errors.password && <span style={{color: 'red'}}>{errors.password.message}</span>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
};
