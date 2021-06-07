<?php declare(strict_types=1);

namespace App\WebGPUKernel;

class PipeCollection implements \IteratorAggregate, \Countable, CollectionInterface
{
    /** @var pipeyInterface[] $pipeList */
    private array $pipeList = [];

    private PipeIterator $pipeIterator;

    public function getIterator(): PipeIterator
    {
        if(!isset($this->pipeIterator))
            $this->pipeIterator = new PipeIterator($this);

        return $this->pipeIterator;
    }

    public function getAll(): array
    {
        return $this->pipeList;
    }

    public function add($pipe): self
    {
        $this->pipeList[] = $pipe;
        return $this;
    }

    public function pop(bool $resetIndex = true)
    {
        unset($this->pipeList[count($this->pipeList) - 1]);

        if($resetIndex)
            $this->resetIndex();
    }

    public function remove(int $index, bool $resetIndex = true)
    {
        unset($this->pipeList[$index]);

        if($resetIndex)
            $this->resetIndex();
    }

    public function count(): int
    {
        return count($this->pipeList);
    }

    public function resetIndex()
    {
        $this->pipeList = array_values($this->pipeList);
    }

    public function isEmpty(): bool
    {
        return empty($this->pipeList) ? true : false;
    }
}