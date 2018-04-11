'use strict';

describe('D3 bar chart', function () {
    var chart;
    var chartContainer;

    describe('instructor view', function(){

        beforeEach(function() {
            var scope = {role:'instructor'};
            chart = d3.custom.barChart(scope);
            chartContainer = d3.select('body')
                .append('div')
                .attr('class', 'testContainer');
        });

        afterEach(function() {
            // clean up
            chartContainer.remove();
        });

        it('should provide getters and setters', function() {
            var defaultChartWidth  = chart.width();
            var defaultChartHeight = chart.height();
            var defaultMinTotalFrequency = chart.minTotalFrequency();

            chart.width(100)
                .height(50)
                .minTotalFrequency(20);

            var newChartWidth  = chart.width();
            var newChartHeight = chart.height();
            var newMinTotalFrequency = chart.minTotalFrequency();


            expect(defaultChartWidth).not.toBe(100);
            expect(defaultChartHeight).not.toBe(50);
            expect(defaultMinTotalFrequency).not.toBe(20);
            expect(newChartWidth).toBe(100);
            expect(newChartHeight).toBe(50);
            expect(newMinTotalFrequency).toBe(20);
        });


        it('should have a minTotalFrequency of 1', function(){
            var defaultMinTotalFrequency = chart.minTotalFrequency();
            expect(defaultMinTotalFrequency).toBe(1);
        });
    });
    
      describe('student view', function(){

        beforeEach(function() {
            var scope = {role:'student'};
            chart = d3.custom.barChart(scope);
            chartContainer = d3.select('body')
                .append('div')
                .attr('class', 'testContainer');
        });

        afterEach(function() {
            // clean up
            chartContainer.remove();
        });

        it('should provide getters and setters', function() {
            var defaultChartWidth  = chart.width();
            var defaultChartHeight = chart.height();
            var defaultMinTotalFrequency = chart.minTotalFrequency();

            chart.width(100)
                .height(50)
                .minTotalFrequency(20);

            var newChartWidth  = chart.width();
            var newChartHeight = chart.height();
            var newMinTotalFrequency = chart.minTotalFrequency();


            expect(defaultChartWidth).not.toBe(100);
            expect(defaultChartHeight).not.toBe(50);
            expect(defaultMinTotalFrequency).not.toBe(20);
            expect(newChartWidth).toBe(100);
            expect(newChartHeight).toBe(50);
            expect(newMinTotalFrequency).toBe(20);
        });

        it('should have a minTotalFrequency of 10', function(){
            var defaultMinTotalFrequency = chart.minTotalFrequency();
            expect(defaultMinTotalFrequency).toBe(10);
        });
    });


    
    //it('should render a chart with minimal requirements', function() {
    //
    //    chartContainer.datum(dataset)
    //        .call(chart);
    //
    //    var lineContainer = chartContainer.selectAll('svg.chartContainer');
    //    var line          = lineContainer.selectAll('path.line');
    //
    //    expect(lineContainer.empty()).not.toBe(true);
    //    expect(line.empty()).not.toBe(true);
    //});
});


describe('D3 per answer chart', function () {
    var chart;
    var chartContainer;

    describe('instructor view', function(){

        beforeEach(function() {
            var scope = {role:'instructor'};
            chart = d3.custom.perAnswerChart(scope);
            chartContainer = d3.select('body')
                .append('div')
                .attr('class', 'testContainer');
        });

        afterEach(function() {
            // clean up
            chartContainer.remove();
        });

        it('should provide getters and setters', function() {
            var defaultChartWidth  = chart.width();
            var defaultChartHeight = chart.height();
            var defaultMinTotalFrequency = chart.minTotalFrequency();

            chart.width(100)
                .height(50)
                .minTotalFrequency(20);

            var newChartWidth  = chart.width();
            var newChartHeight = chart.height();
            var newMinTotalFrequency = chart.minTotalFrequency();


            expect(defaultChartWidth).not.toBe(100);
            expect(defaultChartHeight).not.toBe(50);
            expect(defaultMinTotalFrequency).not.toBe(20);
            expect(newChartWidth).toBe(100);
            expect(newChartHeight).toBe(50);
            expect(newMinTotalFrequency).toBe(20);
        });


        it('should have a minTotalFrequency of 1', function(){
            var defaultMinTotalFrequency = chart.minTotalFrequency();
            expect(defaultMinTotalFrequency).toBe(1);
        });
    });

    describe('student view', function(){

        beforeEach(function() {
            var scope = {role:'student'};
            chart = d3.custom.barChart(scope);
            chartContainer = d3.select('body')
                .append('div')
                .attr('class', 'testContainer');
        });

        afterEach(function() {
            // clean up
            chartContainer.remove();
        });

        it('should provide getters and setters', function() {
            var defaultChartWidth  = chart.width();
            var defaultChartHeight = chart.height();
            var defaultMinTotalFrequency = chart.minTotalFrequency();

            chart.width(100)
                .height(50)
                .minTotalFrequency(20);

            var newChartWidth  = chart.width();
            var newChartHeight = chart.height();
            var newMinTotalFrequency = chart.minTotalFrequency();


            expect(defaultChartWidth).not.toBe(100);
            expect(defaultChartHeight).not.toBe(50);
            expect(defaultMinTotalFrequency).not.toBe(20);
            expect(newChartWidth).toBe(100);
            expect(newChartHeight).toBe(50);
            expect(newMinTotalFrequency).toBe(20);
        });

        it('should have a minTotalFrequency of 10', function(){
            var defaultMinTotalFrequency = chart.minTotalFrequency();
            expect(defaultMinTotalFrequency).toBe(10);
        });
    });
});
