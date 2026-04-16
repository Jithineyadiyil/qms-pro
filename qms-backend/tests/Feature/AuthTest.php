<?php
namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * TC-AUTH-001 TC-AUTH-002 TC-AUTH-005 TC-AUTH-006 TC-AUTH-008
 */
class AuthTest extends TestCase
{
    // ── Login ──────────────────────────────────────────────────────────────

    public function test_valid_user_can_login(): void
    {
        $user = $this->qaManager();

        $res = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'Password@123',
        ]);

        $res->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);
    }

    public function test_invalid_credentials_rejected(): void
    {
        $user = $this->qaManager();

        $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'wrongpassword',
        ])->assertStatus(422);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $user = $this->makeUser('employee', ['request.view'], ['is_active' => false]);

        $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'Password@123',
        ])->assertStatus(403);
    }

    public function test_missing_email_field_validation(): void
    {
        $this->postJson('/api/auth/login', ['password' => 'Password@123'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    // ── Logout ─────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_logout(): void
    {
        $user    = $this->qaManager();
        $headers = $this->authAs($user);

        $this->postJson('/api/auth/logout', [], $headers)->assertOk();
    }

    public function test_unauthenticated_logout_returns_401(): void
    {
        $this->postJson('/api/auth/logout')->assertStatus(401);
    }

    // ── Token & Profile ────────────────────────────────────────────────────

    public function test_authenticated_user_can_get_profile(): void
    {
        $user    = $this->qaManager();
        $headers = $this->authAs($user);

        $this->getJson('/api/auth/me', $headers)
            ->assertOk()
            ->assertJsonFragment(['email' => $user->email]);
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
    }
}
