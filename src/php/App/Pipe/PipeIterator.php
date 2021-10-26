<?php declare(strict_types=1);

namespace App\Pipe;

class PipeIterator implements \Iterator
{
    private array $pipeList = [];
    private PipeCollection $pipeCollection;

    public function __construct(PipeCollection $pipeCollection)
    {
        $this->pipeCollection = $pipeCollection;
    }

    public function rewind(): void
    {
        $this->pipeList = $this->pipeCollection->getAll();
        reset($this->pipeList);
    }

    public function current(): PipeInterface
    {
        return current($this->pipeList);
    }

    public function key(): mixed
    {
        return key($this->pipeList);
    }

    public function next(): void
    {
        next($this->pipeList);
    }

    public function valid(): bool
    {
        $pipe = current($this->pipeList);

        return !empty($pipe) && $pipe instanceof PipeInterface;
    }
}
