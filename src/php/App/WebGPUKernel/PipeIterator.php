<?php declare(strict_types=1);

namespace App\WebGPUKernel;

class PipeIterator implements \Iterator
{
    /** @var PipeInterface[] $pipeList */
    private array $pipeList = [];
    private PipeCollection $pipeCollection;

    public function __construct(PipeCollection $pipeCollection)
    {
        $this->pipeCollection = $pipeCollection;
    }

    public function rewind() 
    {
        $this->pipeList = $this->pipeCollection->getAll();
        reset($this->pipeList);
    }

    public function current(): PipeInterface
    {
        return current($this->pipeList);
    }

    public function key()
    {
        return key($this->pipeList);
    }

    public function next()
    {
        next($this->pipeList);
    }

    public function valid(): bool
    {
        $pipe = current($this->pipeList);
        return !empty($pipe) && $pipe instanceof PipeInterface;
    }
}