import Stripe from 'stripe';
import { User, InsertPaymentMethod, PaymentMethod, InsertBillingTransaction, BillingTransaction } from '@shared/schema';
import { storage } from './storage';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not defined. Stripe functionality will be limited.");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_dev', {
  apiVersion: '2025-04-30.basil',
});

export const stripeService = {
  /**
   * Create a Stripe customer for a user
   */
  async createCustomer(user: User): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: {
          userId: user.id.toString(),
        },
      });

      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create Stripe customer');
    }
  },

  /**
   * Create a subscription for a user
   */
  async createSubscription(
    user: User,
    paymentMethodId: string,
  ): Promise<{ subscriptionId: string; clientSecret: string | null }> {
    try {
      // Ensure the user has a Stripe customer ID
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        customerId = await this.createCustomer(user);
        await storage.updateUserStripeCustomerId(user.id, customerId);
      }

      // Attach the payment method to the customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set the payment method as the default
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: 'price_monthly', // This would be your actual price ID in production
            quantity: 1,
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      // Store the subscription ID
      await storage.updateUserStripeSubscriptionId(user.id, subscription.id);

      // Get the client secret for the payment intent
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      // Access the paymentIntent safely by handling the potential undefined value
      // The expand option ensures this should be available as a PaymentIntent object
      const paymentIntent = (invoice.payment_intent as unknown) as Stripe.PaymentIntent;

      return {
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  },

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  },

  /**
   * Get a payment method
   */
  async getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      return await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error) {
      console.error('Error retrieving payment method:', error);
      throw new Error('Failed to retrieve payment method');
    }
  },

  /**
   * Save a payment method to the database
   */
  async savePaymentMethod(
    userId: number,
    paymentMethodId: string,
    isDefault: boolean = false
  ): Promise<PaymentMethod> {
    try {
      // Retrieve the payment method from Stripe
      const paymentMethod = await this.getPaymentMethod(paymentMethodId);
      
      if (paymentMethod.type !== 'card' || !paymentMethod.card) {
        throw new Error('Invalid payment method type');
      }

      // Create the payment method record
      const paymentMethodData: InsertPaymentMethod = {
        userId,
        stripePaymentMethodId: paymentMethodId,
        cardBrand: paymentMethod.card.brand,
        cardLast4: paymentMethod.card.last4,
        cardExpMonth: paymentMethod.card.exp_month,
        cardExpYear: paymentMethod.card.exp_year,
        isDefault,
      };

      return await storage.createPaymentMethod(paymentMethodData);
    } catch (error) {
      console.error('Error saving payment method:', error);
      throw new Error('Failed to save payment method');
    }
  },

  /**
   * Create a payment intent for a one-time payment
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    customerId?: string
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  },

  /**
   * Record a successful payment in the database
   */
  async recordPayment(
    userId: number,
    amount: number,
    paymentIntentId: string,
    description?: string
  ): Promise<BillingTransaction> {
    try {
      const transactionData: InsertBillingTransaction = {
        userId,
        stripePaymentIntentId: paymentIntentId,
        amount,
        currency: 'usd',
        status: 'succeeded',
        description,
      };

      return await storage.createBillingTransaction(transactionData);
    } catch (error) {
      console.error('Error recording payment:', error);
      throw new Error('Failed to record payment');
    }
  },

  /**
   * Get all payment methods for a user
   */
  async getUserPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    try {
      return await storage.getPaymentMethods(userId);
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw new Error('Failed to get payment methods');
    }
  },

  /**
   * Get billing history for a user
   */
  async getUserBillingHistory(userId: number): Promise<BillingTransaction[]> {
    try {
      return await storage.getBillingTransactions(userId);
    } catch (error) {
      console.error('Error getting billing history:', error);
      throw new Error('Failed to get billing history');
    }
  },

  /**
   * Create a setup intent for updating payment methods
   */
  async createSetupIntent({ customerId }: { customerId: string }): Promise<Stripe.SetupIntent> {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });
      
      return setupIntent;
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw new Error('Failed to create setup intent');
    }
  },
  
  /**
   * Update the default payment method for a customer
   */
  async updateDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      console.error('Error updating default payment method:', error);
      throw new Error('Failed to update default payment method');
    }
  },
};