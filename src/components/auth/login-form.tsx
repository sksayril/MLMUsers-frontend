import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type FormData = z.infer<typeof formSchema>;

export const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      console.log('Attempting to login user:', data.email);
      
      const response = await axios.post(
        'https://7cvccltb-3100.inc1.devtunnels.ms/api/users/login',
        {
          email: data.email,
          password: data.password
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('Login response:', response.data);
      
      if (response.data.success) {
        // Store the token from the API response
        const token = response.data.token;
        console.log('Storing token:', token);
        localStorage.setItem('token', token);
        
        // Set the token in axios default headers for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Fetch user profile with the token
        try {
          const profileResponse = await axios.get(
            'https://7cvccltb-3100.inc1.devtunnels.ms/api/users/profile',
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            }
          );
          
          console.log('Profile response:', profileResponse.data);
          
          if (profileResponse.data.success) {
            // Store the complete user data from profile
            const userData = profileResponse.data.user;
            console.log('Storing user data from profile:', userData);
            localStorage.setItem('user', JSON.stringify(userData));
            
            login({ 
              email: userData.email, 
              id: userData._id, 
              name: userData.name 
            });
            
            toast({
              title: 'Login successful',
              description: 'Welcome back!',
            });
            
            navigate('/');
          } else {
            throw new Error(profileResponse.data.message || 'Failed to fetch profile');
          }
        } catch (profileError) {
          console.error('Profile fetch error:', profileError);
          throw new Error('Failed to fetch user profile');
        }
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (axios.isAxiosError(error)) {
        toast({
          title: 'Login failed',
          description: error.response?.data?.message || error.message || 'Please check your credentials and try again',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login failed',
          description: error instanceof Error ? error.message : 'Please check your credentials and try again',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          disabled={isLoading}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Button type="button" variant="link" className="px-0 font-normal h-auto">
            Forgot password?
          </Button>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isLoading}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
};