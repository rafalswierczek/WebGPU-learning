<?php declare(strict_types=1);

namespace App\Task;

abstract class Task implements TaskInterface
{
    public abstract function execute(): bool;
}
