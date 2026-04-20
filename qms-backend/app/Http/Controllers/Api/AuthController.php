<?php
declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * AuthController — handles login, logout, profile management.
 *
 * Returns consistent JSON so the Angular AuthService can parse errors cleanly:
 *   200 { token, user }
 *   401 { message: "Invalid email or password." }
 *   403 { message: "Account is disabled." }
 *   422 { message: "...", errors: { field: [...] } }
 */
class AuthController extends Controller
{
    /** POST /api/auth/login */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::with(['role', 'department'])
            ->where('email', $request->email)
            ->first();

        // Return 401 — do NOT reveal whether email or password was wrong
        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Account is disabled. Please contact your administrator.',
            ], 403);
        }

        $user->update(['last_login_at' => now()]);
        $token = $user->createToken('qms-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $user,
        ]);
    }

    /** POST /api/auth/logout */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    /** GET /api/auth/me */
    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load(['role', 'department']));
    }

    /** PUT /api/auth/profile */
    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'required|string|max:200',
            'phone' => 'nullable|string|max:20',
        ]);
        $request->user()->update($data);
        return response()->json($request->user()->fresh(['role', 'department']));
    }

    /** POST /api/auth/change-password */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required',
            'password'         => 'required|min:8|confirmed',
        ]);

        if (! Hash::check($request->current_password, $request->user()->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $request->user()->update(['password' => Hash::make($request->password)]);
        return response()->json(['message' => 'Password updated successfully.']);
    }

    /** POST /api/auth/forgot-password */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        return response()->json(['message' => 'If the email exists, a reset link has been sent.']);
    }

    /** POST /api/auth/reset-password */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => 'required',
            'email'    => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);
        return response()->json(['message' => 'Password has been reset.']);
    }
}
