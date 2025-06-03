import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string(),
  referralCode: z.string().optional(),
  terms: z.boolean().refine(val => val === true, { 
    message: 'You must accept the terms and conditions' 
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof formSchema>;

export const SignupForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      referralCode: '',
      terms: false,
    },
  });

  const termsChecked = watch('terms');

  console.log('Form validation errors:', errors);

  const onSubmit = async (data: FormData) => {
    console.log('Form submitted with data:', data);
    setIsLoading(true);
    
    try {
      console.log('Attempting to register user:', data.email);
      
      const payload: any = {
        name: data.name,
        email: data.email,
        password: data.password
      };
      if (data.referralCode && data.referralCode.trim() !== '') {
        payload.referralCode = data.referralCode.trim();
      }
      const response = await axios.post(
        'http://localhost:3100/api/users/register',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('Registration response:', response.data);
      
      if (response.data.success) {
        // Store the token from the API response
        const token = response.data.token;
        console.log('Storing token:', token);
        localStorage.setItem('token', token);
        
        // Store the user data
        const userData = response.data.user;
        console.log('Storing user data:', userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Set the token in axios default headers for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        login({ 
          email: userData.email, 
          id: userData.id, 
          name: userData.name 
        });
        
        toast({
          title: 'Account created',
          description: 'Welcome to Utp Fund!',
        });
        
        navigate('/');
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (axios.isAxiosError(error)) {
        toast({
          title: 'Signup failed',
          description: error.response?.data?.message || error.message || 'There was a problem creating your account',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Signup failed',
          description: error instanceof Error ? error.message : 'There was a problem creating your account',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit((data) => {
      console.log('Form submitted, calling onSubmit');
      console.log('Form validation errors at submission:', errors);
      onSubmit(data);
    })} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          placeholder="John Doe"
          disabled={isLoading}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
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
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          disabled={isLoading}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          disabled={isLoading}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="referral-code">Referral Code (optional)</Label>
        <Input
          id="referral-code"
          placeholder="Enter referral code (if any)"
          disabled={isLoading}
          {...register('referralCode')}
        />
        {errors.referralCode && (
          <p className="text-sm text-destructive">{errors.referralCode.message}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="terms"
          checked={termsChecked}
          onCheckedChange={(checked) => {
            setValue('terms', checked as boolean);
          }}
        />
        <Label htmlFor="terms" className="text-sm">
          I accept the <Button variant="link" className="p-0 h-auto font-normal">terms and conditions</Button>
        </Label>
      </div>
      {errors.terms && (
        <p className="text-sm text-destructive">{errors.terms.message}</p>
      )}
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
};