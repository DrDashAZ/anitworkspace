import { normalizeString, levenshteinDistance } from '../utils/string-utils';
import { Component, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { SupabaseService, Restaurant } from '../services/supabase.service';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurant-list.html',
  styleUrls: ['./restaurant-list.css']
})
export class RestaurantListComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  public adminService = inject(AdminService);

  restaurants = signal<Restaurant[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  visibleNoteId = signal<string | null>(null);

  async ngOnInit() {
    await this.loadRestaurants();
  }

  async loadRestaurants() {
    try {
      this.loading.set(true);
      const data = await this.supabaseService.getRestaurants();
      this.restaurants.set(data);
    } catch (err: any) {
      this.error.set(err.message);
    } finally {
      this.loading.set(false);
    }
  }

  async addRestaurant(name: string) {
    if (!name.trim()) return;

    const normalizedNewName = normalizeString(name);
    const existingRestaurants = this.restaurants();

    // Check for exact duplicate
    const exactMatch = existingRestaurants.find(r => normalizeString(r.name) === normalizedNewName);
    if (exactMatch) {
      alert(`"${exactMatch.name}" is already in the list.`);
      return;
    }

    // Check for fuzzy match
    // Only check against restaurants that are active or inactive? Plan implies avoiding duplicates in the list.
    // Assuming the list contains all restaurants.
    const fuzzyMatch = existingRestaurants.find(r => {
      const dist = levenshteinDistance(normalizeString(r.name), normalizedNewName);
      // Threshold: if length < 5, distance 1 is too much? maybe not.
      // Let's stick to simple distance < 3 for now as per plan, maybe refined based on length.
      // If word is "Subway" (6), "Subwayy" (7) distance is 1.
      // "McD" (3), "McDc" (4) distance 1.
      return dist > 0 && dist < 3;
    });

    if (fuzzyMatch) {
      const shouldAdd = confirm(`"${name}" looks similar to existing "${fuzzyMatch.name}".\n\nClick OK to add it anyway, or Cancel to discard.`);
      if (!shouldAdd) return;
    }

    try {
      await this.supabaseService.addRestaurant(name);
      await this.loadRestaurants();
    } catch (err: any) {
      this.error.set(err.message);
    }
  }

  async deleteRestaurant(id: string) {
    if (!confirm('Remove this restaurant?')) return;
    try {
      await this.supabaseService.deleteRestaurant(id);
      await this.loadRestaurants();
    } catch (err: any) {
      this.error.set(err.message);
    }
  }

  async resetCooldown(id: string) {
    try {
      await this.supabaseService.resetCooldown(id);
      await this.loadRestaurants();
    } catch (err: any) {
      this.error.set(err.message);
    }
  }

  toggleNote(id: string) {
    if (this.visibleNoteId() === id) {
      this.visibleNoteId.set(null);
    } else {
      this.visibleNoteId.set(id);
    }
  }

  async saveNote(id: string, note: string) {
    try {
      await this.supabaseService.updateRestaurant(id, { note });
      // Update local state reflectively if needed, or reload. Reload is safer for consistency.
      await this.loadRestaurants();
    } catch (err: any) {
      this.error.set(err.message);
    }
  }

  getNote(id: string): string {
    const r = this.restaurants().find(x => x.id === id);
    return r?.note || '';
  }
}
