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
  mobile: z.string()
    .min(10, { message: 'Mobile number must be at least 10 digits' })
    .max(15, { message: 'Mobile number must not exceed 15 digits' })
    .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Please enter a valid mobile number' }),
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
      mobile: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      console.log('Attempting to login user:', data.mobile);
      
      const response = await axios.post(
        'https://api.utpfund.live/api/users/login',
        {
          mobile: data.mobile,
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
        
        // Use the user data directly from the login response
        const userData = response.data.user;
        console.log('User data from login response:', userData);
        
        // Prepare user data with wallet information
        const userDataForAuth = { 
          mobile: userData.mobile, 
          id: userData.id, 
          name: userData.name,
          referralCode: userData.referralCode,
          level: userData.level,
          wallet: userData.wallet,
          email: userData.email
        };
        
        // Store the complete user data
        localStorage.setItem('user', JSON.stringify(userDataForAuth));
        
        // Update auth context
        login(userDataForAuth);
        
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
        });
        
        navigate('/');
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
        <Label htmlFor="mobile">Mobile Number</Label>
        <Input
          id="mobile"
          type="tel"
          placeholder="+1234567890"
          autoComplete="tel"
          disabled={isLoading}
          {...register('mobile')}
        />
        {errors.mobile && (
          <p className="text-sm text-destructive">{errors.mobile.message}</p>
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