<?php declare(strict_types=1);

namespace App\Task;

use App\WebGPUKernel\TaskInterface;

abstract class Task implements TaskInterface
{
    public function execute(): bool
    {
        return false;
    }
}