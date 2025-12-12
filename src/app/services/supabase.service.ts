import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface Restaurant {
    id: string;
    name: string;
    created_at: string;
    last_selected_at: string | null;
    is_active: boolean;
    note?: string;
}

export interface Rating {
    id: string;
    restaurant_id: string;
    user_email: string;
    rating: number;
    created_at: string;
}

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    }

    get client() {
        return this.supabase;
    }

    async getRestaurants() {
        const { data, error } = await this.supabase
            .from('restaurants')
            .select('*')
            .order('name');

        if (error) throw error;
        return data as Restaurant[];
    }

    async addRestaurant(name: string) {
        const { data, error } = await this.supabase
            .from('restaurants')
            .insert({ name })
            .select()
            .single();

        if (error) throw error;
        return data as Restaurant;
    }

    async markAsSelected(id: string) {
        const { error } = await this.supabase
            .from('restaurants')
            .update({ last_selected_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    }

    async resetCooldown(id: string) {
        const { error } = await this.supabase
            .from('restaurants')
            .update({ last_selected_at: null })
            .eq('id', id);

        if (error) throw error;
    }

    async deleteRestaurant(id: string) {
        // Delete ratings first to avoid FK constraint violation
        const { error: rError } = await this.supabase
            .from('ratings')
            .delete()
            .eq('restaurant_id', id);

        if (rError) throw rError;

        const { error } = await this.supabase
            .from('restaurants')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async updateRestaurant(id: string, updates: Partial<Restaurant>) {
        const { error } = await this.supabase
            .from('restaurants')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    }

    async getRatings(restaurantId: string) {
        const { data, error } = await this.supabase
            .from('ratings')
            .select('*')
            .eq('restaurant_id', restaurantId);

        if (error) throw error;
        return data as Rating[];
    }

    async addRating(restaurantId: string, email: string, rating: number) {
        // 1. Validate Email Domain
        if (!email.endsWith('@soundthinking.com')) {
            throw new Error('Invalid email domain. Must be @soundthinking.com');
        }

        // 2. Fetch Restaurant to check last_selected_at
        const { data: restaurant, error: rError } = await this.supabase
            .from('restaurants')
            .select('last_selected_at')
            .eq('id', restaurantId)
            .single();

        if (rError) throw rError;
        if (!restaurant.last_selected_at) {
            throw new Error('Restaurant must be marked as used before rating.');
        }

        // 3. Check for existing rating in the current cycle
        const lastSelectedAt = new Date(restaurant.last_selected_at);

        const { data: existingRatings, error: eError } = await this.supabase
            .from('ratings')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('user_email', email)
            .gt('created_at', lastSelectedAt.toISOString());

        if (eError) throw eError;

        if (existingRatings && existingRatings.length > 0) {
            throw new Error('You may only enter a rating once per restaurant until it is used again.');
        }

        // 4. Insert Rating
        const { data, error } = await this.supabase
            .from('ratings')
            .insert({
                restaurant_id: restaurantId,
                user_email: email,
                rating: rating
            })
            .select()
            .single();

        if (error) throw error;
        return data as Rating;
    }
}
