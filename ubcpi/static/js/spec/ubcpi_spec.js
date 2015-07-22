'use strict';

describe( 'UBCPI XBlock', function() {

    var mockRuntime = {};
    var element;
    var fixture;
    var data;

    jasmine.getFixtures().fixturesPath = 'base/fixtures';

    beforeEach( function() {

    } );

    // Testing fixtures
    it( 'Outputs the question title', function() {

        fixture = loadFixtures( 'question-form.html' );
        var question_heading = $( '.question-text' ).text();

        expect( question_heading ).toEqual( 'Question:' );

    } );

    // Test the unique XBlock ID
    it( 'Ensures XBlock IDs are unique', function() {

        var idOne = generatePIXBlockID();
        var idTwo = generatePIXBlockID();

        expect( idOne ).not.toEqual( idTwo );

    } );

    // it( 'has no idea what it is doing', function() {
    //
    //     fixture = loadFixtures( 'question-form.html' );
    //
    //     mockRuntime = jasmine.createSpyObj( 'runtime', ['handlerUrl'] );
    //     mockRuntime.handlerUrl.and.callFake( function() {
    //         return 'test url';
    //     } );
    //
    //     // Intercept POST requests through JQuery
    //     spyOn( $, 'ajax' ).and.callFake( function( params ) {
    //         // Call through to the success handler
    //         params.success( {up:'test up', down:'test down'} );
    //     });
    //
    //     element = $( 'fieldset' ).get();
    //
    //     // select first answer
    //     // var answer = $( element ).find( 'input[type="radio"]:first' );
    //     // console.log( answer.eq(0) );
    //     // $( answer ).eq(0).click();
    //     //
    //     // // Mock a rationale
    //     // var textarea = $( element ).find( 'textarea' );
    //     // $( textarea ).val( 'Mock rationale' );
    //     //
    //     // var button = $( element ).find( 'input[type="button"]' );
    //     // $( button ).click();
    //
    //     // var pixb = PeerInstructionXBlock( mockRuntime, element, data );
    //
    // } );

} );

describe( 'UBCPI XBlock Statuses', function() {

    var mockSelf;

    beforeEach( function() {
        mockSelf = {};
    } );

    // Test the default statuses are as we expect
    it( 'Ensures the default statuses are as we expect', function() {

        var statuses = setDefaultStatuses( mockSelf );

        expect( mockSelf.STATUS_NEW ).toEqual( 0 );
        expect( mockSelf.STATUS_ANSWERED ).toEqual( 1 );
        expect( mockSelf.STATUS_REVISED ).toEqual( 2 );

    } );

    // Test what status is set when on the first step
    it( 'Ensures status 0 when on first step', function() {

        mockSelf = setDefaultStatuses( mockSelf );

        var answer_original = null;
        var answer_revised = null;

        var status = getStatus( answer_original, answer_revised, mockSelf );

        expect( status ).toEqual( 0 );

    } );

    // Test what status is set when on the second step
    it( 'Ensures status 1 when on second step', function() {

        mockSelf = setDefaultStatuses( mockSelf );

        var answer_original = 'Test answer';
        var answer_revised = null;

        var status = getStatus( answer_original, answer_revised, mockSelf );

        expect( status ).toEqual( 1 );

    } );

    // Test what status is set when on the third step
    it( 'Ensures status 2 when on third step', function() {

        mockSelf = setDefaultStatuses( mockSelf );

        var answer_original = 'Test answer';
        var answer_revised = 'Revised answer';

        var status = getStatus( answer_original, answer_revised, mockSelf );

        expect( status ).toEqual( 2 );

    } );

} );


describe( 'UBCPI XBlock Submissions Enabled', function() {

    var mockSelf;
    var mockScope;
    var disabledButton;

    beforeEach( function() {

        mockSelf = {
            answer: null,
            rationale: undefined,
            submitting: false,
        };

        mockScope = {
            rationale_size: {
                min: 1,
                max: 32000
            }
        };

    } );

    // Test that the submit button should be disabled when no answer is given
    it( 'Ensures the submit button is disabled when no answer', function() {

        disabledButton = disableSubmit( mockSelf, mockScope );

        expect( disabledButton ).toEqual( true );

    } );

    // Test that the submit button should be disabled when an answer is given, but no rationale
    it( 'Ensures the submit button is disabled when no rationale', function() {

        mockSelf.answer = 1;
        disabledButton = disableSubmit( mockSelf, mockScope );

        expect( disabledButton ).toEqual( true );

    } );

    // Test that if we have an answer and a rationale (with default min/max) that the submit button is enabled
    it( 'Ensures the submit button is ENABLED when answer and rationale provided', function() {

        mockSelf.answer = 1;
        mockSelf.rationale = 'Mock rationale';
        disabledButton = disableSubmit( mockSelf, mockScope );

        expect( disabledButton ).toEqual( false );

    } );

    // Now test that the max/min stuff works as expected
    it( 'Ensures that when the rationale is not long enough the submit button is disabled', function() {

        mockScope.rationale_size.min = 20;
        mockSelf.answer = 1;
        mockSelf.rationale = 'Answer too short'; // 16 chars
        disabledButton = disableSubmit( mockSelf, mockScope );

        expect( disabledButton ).toEqual( true );

    } );

    it( 'Ensures that when the rationale is too long the submit button is disabled', function() {

        mockScope.rationale_size.max = 10;
        mockSelf.answer = 1;
        mockSelf.rationale = 'Answer too long'; // 16 chars
        disabledButton = disableSubmit( mockSelf, mockScope );

        expect( disabledButton ).toEqual( true );

    } );

} );

describe( 'angular app', function() {

    var mockData = {
        xblock_usage_id: 'i4x://edX/DemoX/ubcpi/03e18731c6e74896a780737da1a7a3aa'
    };

    beforeEach( module( appId, ['nvd3ChartDirectives', 'ngSanitize', 'ngMock'] ) );

    var $controller;

    beforeEach( inject( function( _$controller_ ) {
        // The injector unwraps the underscores (_) from around the parameter names when matching
        $controller = _$controller_;
    } ) );

    describe( 'app directive', function() {

        it( 'is an integer for a html radio button value', function() {
            console.log( 'here?' );
        } )

    } );

} );
