<?php declare(strict_types=1);

namespace App\Component;

class Response
{
    private array $headers = [
        'content-type' => 'text/html'
    ];
    private int $statusCode;
    private string $body;


    public function __construct(string $body, int $statusCode = 200, array $headers = [])
    {
        $this->headers = $this->setHeaders($headers);
        $this->statusCode = $statusCode;
        $this->body = $body;
    }

    public function show(): void
    {
        http_response_code($this->statusCode);

        foreach($this->headers as $key => $value)
            header("$key: $value");

        echo $this->body;

        exit;
    }

    private function setHeaders(array $headers): array
    {
        foreach($headers as $key => $value)
            $headers[$key] = strtolower($value);
        
        return array_merge($this->headers, $headers);
    }
}
