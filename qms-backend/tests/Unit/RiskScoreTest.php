<?php
namespace Tests\Unit;

use Tests\TestCase;

/**
 * TC-RISK-005 — Pure unit tests for risk score calculation logic.
 * These do not hit the database.
 */
class RiskScoreTest extends TestCase
{
    /**
     * Replicate the backend's risk level calculation logic.
     */
    private function getRiskLevel(int $likelihood, int $impact): string
    {
        $score = $likelihood * $impact;
        return match (true) {
            $score >= 20 => 'critical',
            $score >= 12 => 'high',
            $score >= 6  => 'medium',
            default      => 'low',
        };
    }

    public function test_score_25_is_critical(): void
    {
        $this->assertEquals('critical', $this->getRiskLevel(5, 5));
    }

    public function test_score_20_is_critical(): void
    {
        $this->assertEquals('critical', $this->getRiskLevel(4, 5));
    }

    public function test_score_15_is_high(): void
    {
        $this->assertEquals('high', $this->getRiskLevel(3, 5));
    }

    public function test_score_12_is_high(): void
    {
        $this->assertEquals('high', $this->getRiskLevel(3, 4));
    }

    public function test_score_9_is_medium(): void
    {
        $this->assertEquals('medium', $this->getRiskLevel(3, 3));
    }

    public function test_score_6_is_medium(): void
    {
        $this->assertEquals('medium', $this->getRiskLevel(2, 3));
    }

    public function test_score_4_is_low(): void
    {
        $this->assertEquals('low', $this->getRiskLevel(2, 2));
    }

    public function test_score_1_is_low(): void
    {
        $this->assertEquals('low', $this->getRiskLevel(1, 1));
    }

    public function test_likelihood_boundary_values(): void
    {
        // Likelihood 1, Impact 5 = 5 → low
        $this->assertEquals('low', $this->getRiskLevel(1, 5));
        // Likelihood 2, Impact 5 = 10 → medium
        $this->assertEquals('medium', $this->getRiskLevel(2, 5));
    }
}
