import { normalizeString, levenshteinDistance } from '../utils/string-utils';
import { Component, inject, OnInit, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, Restaurant, Rating } from '../services/supabase.service';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  visibleRateId = signal<string | null>(null);
  ratingsMap = signal<Map<string, Rating[]>>(new Map());

  // Form state
  // We can use a map or simple temp state since only one form open at a time usually
  ratingEmail = '';
  ratingValue = 10;

  async ngOnInit() {
    await this.loadRestaurants();
  }

  async loadRestaurants() {
    try {
      this.loading.set(true);
      const data = await this.supabaseService.getRestaurants();
      this.restaurants.set(data);

      // Load ratings for all restaurants
      const rMap = new Map<string, Rating[]>();
      await Promise.all(data.map(async (r) => {
        const ratings = await this.supabaseService.getRatings(r.id);
        rMap.set(r.id, ratings);
      }));
      this.ratingsMap.set(rMap);

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

  async selectRestaurant(id: string, name: string) {
    if (!confirm(`Select "${name}" for lunch?\n\nThis will mark it as used and start the cooldown.`)) return;
    try {
      await this.supabaseService.markAsSelected(id);
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
      this.visibleRateId.set(null); // Close rate if open
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

  // Rating Logic
  toggleRate(id: string) {
    if (this.visibleRateId() === id) {
      this.visibleRateId.set(null);
    } else {
      this.ratingEmail = '';
      this.ratingValue = 10;
      this.visibleRateId.set(id);
      this.visibleNoteId.set(null); // Close note if open
    }
  }

  getAverageRating(id: string): string {
    const ratings = this.ratingsMap().get(id) || [];
    if (ratings.length === 0) return 'New';

    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = sum / ratings.length;
    return avg.toFixed(1); // e.g., "8.5"
  }

  getStarDisplay(value: number): string {
    // Return a string of stars
    return '⭐'.repeat(Math.min(Math.max(value, 0), 10));
  }

  async submitRating(id: string) {
    if (!this.ratingEmail.trim()) {
      alert('Email is required.');
      return;
    }

    // Basic validation, service handles strict check
    if (!this.ratingEmail.endsWith('@soundthinking.com')) {
      alert('Email must end with @soundthinking.com');
      return;
    }

    try {
      await this.supabaseService.addRating(id, this.ratingEmail, this.ratingValue);
      alert('Rating submitted!');
      this.visibleRateId.set(null);
      await this.loadRestaurants(); // Reload to update average
    } catch (err: any) {
      alert(err.message);
    }
  }
}
