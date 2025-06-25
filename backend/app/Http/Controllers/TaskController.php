<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index()
    {
        return Task::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'deadline' => 'required|date',
        ]);

        return Task::create($validated);
    }

    public function destroy($id)
    {
        $task = Task::findOrFail($id);
        $task->delete();

        return response()->json(['message' => 'Task deleted successfully']);
    }

    // TaskController.php
    public function update(Request $request, $id)
    {
        $request->validate([
            'title' => 'required|string',
            'deadline' => 'nullable|date',
            'is_done' => 'boolean',
        ]);

        $task = Task::findOrFail($id);
        $task->update($request->only(['title', 'deadline', 'is_done']));

        return response()->json($task);
    }
}
