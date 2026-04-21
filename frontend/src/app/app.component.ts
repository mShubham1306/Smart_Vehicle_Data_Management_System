import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent implements OnInit {
  title = 'frontend';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Wake up Render backend from cold-start (fire-and-forget)
    const healthUrl = environment.apiUrl.replace('/api', '') + '/health';
    this.http.get(healthUrl).subscribe({ error: () => {} });
  }
}

