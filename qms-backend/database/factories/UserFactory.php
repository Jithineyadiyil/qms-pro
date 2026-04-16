<?php
namespace Database\Factories;

use App\Models\User;
use App\Models\Role;
use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name'          => $this->faker->name(),
            'email'         => $this->faker->unique()->safeEmail(),
            'password'      => Hash::make('Password@123'),
            'employee_id'   => 'EMP' . $this->faker->unique()->numberBetween(100, 999),
            'phone'         => $this->faker->phoneNumber(),
            'is_active'     => true,
            'role_id'       => null,
            'department_id' => null,
        ];
    }
}
