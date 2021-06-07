<?php declare(strict_types=1);

namespace App\WebGPUKernel;

interface CollectionInterface
{
    public function getIterator(): \Iterator;
    public function getAll(): array;
    public function add($object): self;
    public function pop(bool $resetIndex = true);
    public function remove(int $index, bool $resetIndex = true);
    public function count(): int;
    public function resetIndex();
    public function isEmpty(): bool;
}