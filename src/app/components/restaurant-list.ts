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
}
