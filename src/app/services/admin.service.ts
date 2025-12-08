import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService, Restaurant } from './supabase.service';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private supabaseService = inject(SupabaseService);

    private _isAuthenticated = signal<boolean>(false);
    isAuthenticated = computed(() => this._isAuthenticated());

    // Default cooldown settings (local cache, ideally fetched from DB settings table)
    cooldownDays = signal<number>(30);

    checkPassword(password: string): boolean {
        if (password === 'lizrulz') {
            this._isAuthenticated.set(true);
            return true;
        }
        return false;
    }

    logout() {
        this._isAuthenticated.set(false);
    }

    // selection logic
    async selectRandomLunch(restaurants: Restaurant[]): Promise<Restaurant | null> {
        // Filter valid
        const now = new Date();
        const validCandidates = restaurants.filter(r => {
            if (!r.last_selected_at) return true;

            const lastSelected = new Date(r.last_selected_at);
            const daysSince = (now.getTime() - lastSelected.getTime()) / (1000 * 3600 * 24);

            return daysSince >= this.cooldownDays();
        });

        if (validCandidates.length === 0) return null;

        const match = validCandidates[Math.floor(Math.random() * validCandidates.length)];

        // Update DB
        await this.supabaseService.markAsSelected(match.id);

        return match;
    }
}
