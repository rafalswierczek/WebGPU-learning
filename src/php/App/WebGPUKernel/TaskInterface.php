<?php declare(strict_types=1);

namespace App\WebGPUKernel;

interface TaskInterface
{
    public function execute(): bool;
}