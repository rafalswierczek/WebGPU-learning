<?php declare(strict_types=1);

namespace App\Pipe;

class PipeCollection implements \IteratorAggregate, \Countable
{
    private array $pipeList = [];
    private PipeIterator $pipeIterator;

    public function getIterator(): PipeIterator
    {
        // allow to get manually the same iterator and handle it:
        if (!isset($this->pipeIterator)) {
            $this->pipeIterator = new PipeIterator($this);
        }

        return $this->pipeIterator;
    }

    public function getAll(): array
    {
        return $this->pipeList;
    }

    public function add(PipeInterface $pipe): self
    {
        $this->pipeList[] = $pipe;

        return $this;
    }

    public function pop(bool $resetIndex = true): self
    {
        unset($this->pipeList[count($this->pipeList) - 1]);

        if ($resetIndex) {
            $this->resetIndex();
        }

        return $this;
    }

    public function remove(int $index, bool $resetIndex = true): self
    {
        unset($this->pipeList[$index]);

        if ($resetIndex) {
            $this->resetIndex();
        }

        return $this;
    }

    public function count(): int
    {
        return count($this->pipeList);
    }

    public function resetIndex(): self
    {
        $this->pipeList = array_values($this->pipeList);

        return $this;
    }

    public function isEmpty(): bool
    {
        return empty($this->pipeList);
    }
}
