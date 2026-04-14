<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\QmsNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller {
    public function index(Request $request) {
        $notifications = QmsNotification::where('user_id',$request->user()->id)->orderByDesc('created_at')->paginate(20);
        return response()->json($notifications);
    }
    public function markRead(Request $request, $id) {
        QmsNotification::where('id',$id)->where('user_id',$request->user()->id)->update(['read_at'=>now()]);
        return response()->json(['message'=>'Marked as read.']);
    }
    public function markAllRead(Request $request) {
        QmsNotification::where('user_id',$request->user()->id)->whereNull('read_at')->update(['read_at'=>now()]);
        return response()->json(['message'=>'All notifications marked as read.']);
    }
}
