'use strict';

describe( 'UBCPI XBlock', function() {

    var mockRuntime = {};
    var element;
    var fixture;

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
    //     var pixb = PeerInstructionXBlock( mockRuntime, element );
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
                max: '#'
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
