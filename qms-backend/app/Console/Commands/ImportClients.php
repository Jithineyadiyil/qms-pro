<?php

namespace App\Console\Commands;

use App\Models\Client;
use Illuminate\Console\Command;

class ImportClients extends Command
{
    protected $signature = 'clients:import {file}';
    protected $description = 'Import clients from CSV';

    public function handle()
    {
        $file = $this->argument('file');

        if (!file_exists($file)) {
            $this->error('File not found');
            return;
        }

        $handle = fopen($file, "r");

        $header = fgetcsv($handle);

        $nextId = Client::max('id') + 1;

        while (($row = fgetcsv($handle)) !== false) {

            $data = array_combine($header, $row);

            $code = 'CLI' . str_pad($nextId, 5, '0', STR_PAD_LEFT);

            Client::create([
                'name' => $data['name'] ?? null,
                'code' => $code,
                'contact_email' => $data['email'] ?? null,
                'contact_phone' => $data['mobile'] ?? $data['phone'] ?? null,
                'type' => 'client',
                'status' => 'active'
            ]);

            $nextId++;
        }

        fclose($handle);

        $this->info('Clients imported successfully.');
    }
}