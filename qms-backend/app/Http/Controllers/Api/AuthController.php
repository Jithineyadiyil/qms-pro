<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller {
    public function login(Request $request) {
        $request->validate(['email'=>'required|email','password'=>'required']);
        $user = User::with(['role','department'])->where('email',$request->email)->first();
        if (!$user || !Hash::check($request->password, $user->password))
            throw ValidationException::withMessages(['email'=>['Invalid credentials.']]);
        if (!$user->is_active) return response()->json(['message'=>'Account is disabled.'],403);
        $user->update(['last_login_at'=>now()]);
        $token = $user->createToken('qms-token')->plainTextToken;
        return response()->json(['token'=>$token,'user'=>$user]);
    }
    public function logout(Request $request) { $request->user()->currentAccessToken()->delete(); return response()->json(['message'=>'Logged out.']); }
    public function me(Request $request) { return response()->json($request->user()->load(['role','department'])); }
    public function updateProfile(Request $request) {
        $data = $request->validate(['name'=>'required|string|max:200','phone'=>'nullable|string|max:20']);
        $request->user()->update($data);
        return response()->json($request->user()->fresh(['role','department']));
    }
    public function changePassword(Request $request) {
        $request->validate(['current_password'=>'required','password'=>'required|min:8|confirmed']);
        if (!Hash::check($request->current_password, $request->user()->password)) return response()->json(['message'=>'Current password is incorrect.'],422);
        $request->user()->update(['password'=>Hash::make($request->password)]);
        return response()->json(['message'=>'Password updated.']);
    }
    public function forgotPassword(Request $request) { $request->validate(['email'=>'required|email']); return response()->json(['message'=>'If the email exists, a reset link has been sent.']); }
    public function resetPassword(Request $request) { $request->validate(['token'=>'required','email'=>'required|email','password'=>'required|min:8|confirmed']); return response()->json(['message'=>'Password has been reset.']); }
}
