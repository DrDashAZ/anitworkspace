import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface Restaurant {
    id: string;
    name: string;
    created_at: string;
    last_selected_at: string | null;
    is_active: boolean;
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
        const { error } = await this.supabase
            .from('restaurants')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}
