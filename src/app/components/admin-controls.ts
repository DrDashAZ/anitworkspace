import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../services/admin.service';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-admin-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-controls.html',
  styleUrls: ['./admin-controls.css']
})
export class AdminControlsComponent {
  adminService = inject(AdminService);
  supabaseService = inject(SupabaseService);

  showPasswordInput = signal(false);

  unlock() {
    const password = prompt("Enter Admin Password:");
    if (password && this.adminService.checkPassword(password)) {
      this.showPasswordInput.set(false);
    } else if (password) {
      alert("Wrong password!");
    }
  }

  logout() {
    this.adminService.logout();
  }

  async pickRandom() {
    if (!this.adminService.isAuthenticated()) return;

    // We need to fetch/access the list to pick. 
    // Ideally AdminService should handle the picking if we pass the data, 
    // or we fetch fresh data.
    const restaurants = await this.supabaseService.getRestaurants();
    const selected = await this.adminService.selectRandomLunch(restaurants);

    if (selected) {
      alert(`Winner: ${selected.name}!`);
      // Trigger refresh in other components? 
      // We might need a shared state or reload.
      window.location.reload();
    } else {
      alert("No eligible restaurants found (check cooldowns!)");
    }
  }
}
