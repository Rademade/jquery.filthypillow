/* jquery.filthypillow v.1.3.2
 * simple and fancy datetimepicker
 * by aef
 */
( function( factory ) {
  if ( typeof define === 'function' && define.amd ) {
    define( [ 'jquery' ], factory );
  } else if ( typeof exports === 'object' ) {
    module.exports = factory;
  } else {
    factory( jQuery );
  }
} ( function( $ ) {
  var pluginName = "filthypillow",
      name = "plugin_" + pluginName,
      defaults = {
        startStep: "day",
        minDateTime: null,
        maxDateTime: null, //function returns moment obj
        initialDateTime: null, //function returns moment obj
        enableCalendar: true,
        steps: [ "month", "day", "hour", "minute", "meridiem" ],
        exitOnBackgroundClick: true,
        calendar: {
          isPinned: false,
          saveOnDateSelect: false
        }
      },
      methods = [ "show", "hide", "destroy", "updateDateTime", "updateDateTimeUnit", "setTimeZone" ],
      returnableMethods = [ "getDate", "isValid" ];

  function FilthyPillow( $element, options ) {
    var calendarOptions = $.extend( {}, defaults.calendar, options.calendar || {} );
    this.options = $.extend( {}, defaults, options );
    this.options.calendar = calendarOptions;

    this.$element = $element;
    this.setup( );
  }

  FilthyPillow.prototype = {
    template: '<div class="rademade-calendar fp-container">' +
                '<div class="calendar-data">' +
                  '<div class="calendar-date fp-calendar-calendar"></div>' +
                  //'<div class="calendar-date fp-calendar">' +
                  //  '<span class="fp-month fp-option"></span>/<span class="fp-day fp-option"></span>' +
                  //'</div>' +
                '</div>' +
                '<div class="calendar-time">' +
                  '<div class="time-list fp-clock">' +
                    '<label class="time-box">' +
                      '<span class="time-label">Hours</span>' +
                      '<input class="time-input fp-hour fp-option"/>' +
                    '</label>' +
                    '<label class="time-box">' +
                      '<span class="time-label">Minutes</span>' +
                      '<input contenteditable="true" class="time-input fp-minute fp-option"/>' +
                    '</label>' +
                    //'<span class="fp-meridiem fp-option"></span>' +
                  '</div>' +
                  '<div class="fp-save"><button class="time-btn fp-save-button" type="button">Save</button></div>' +
                '</div>' +
              '</div>',
              //'<div class="fp-description"></div>' +
              //'<div class="fp-errors"></div>' +,
    currentStep: null,
    dateTime: null,
    currentTimeZone: null, //null is browser default
    currentDigit: 0, //first or second digit for key press
    isActiveLeadingZero: 0, //user types in 0 as first digit
    stepRegExp: null,
    isError: false, //error is being shown
    isActive: false, //whether the calendar is active or not

    setup: function( ) {
      this.steps = this.options.steps;
      this.stepRegExp = new RegExp( this.steps.join( "|" ) )
      this.$window = $( window );
      this.$document = $( document );
      this.$body = $( "body" );
      this.id = "filthypillow-" + Math.round( Math.random( ) * 1000 );

      this.$container = $( this.template );
      this.$container.attr( "id", this.id );

      this.$calendar = this.$container.find( ".fp-calendar" );
      this.$options = this.$container.find( ".fp-option" );

      this.$month = this.$calendar.find( ".fp-month" );
      this.$day = this.$calendar.find( ".fp-day" );

      this.$clock = this.$container.find( ".fp-clock" );
      this.$hour = this.$clock.find( ".fp-hour" );
      this.$minute = this.$clock.find( ".fp-minute" );
      this.$meridiem = this.$clock.find( ".fp-meridiem" );

      this.$errorBox = this.$container.find( ".fp-errors" );
      this.$saveButton = this.$container.find( ".fp-save-button" );
      this.$descriptionBox = this.$container.find( ".fp-description" );

      if( this.options.enableCalendar )
        this.calendar = new Calendar( this.$container.find( ".fp-calendar-calendar" ),
        {
          minDateTime: this.options.minDateTime,
          maxDateTime: this.options.maxDateTime,
          onSelectDate: $.proxy( function( year, month, date, opts ) {
            this.updateDateTimeUnit( "month", month, false );
            this.updateDateTimeUnit( "date", date, false );
            this.updateDateTimeUnit( "year", year, false );

            if( this.options.calendar.saveOnDateSelect && opts.activeDateClicked )
              this.$saveButton.click( );
          }, this )
        } );

      this.setInitialDateTime( );
    },

    activateSelectorTool: function( step ) {
      var $element = this[ "$" + step ];
      this.currentStep = step;

      //Highlight element
      this.$container.find( ".active" ).removeClass( "active" );
      $element.addClass( "active" );

      //Reset digit
      this.currentDigit = 0;
      this.isActiveLeadingZero = 0;
      if( this.options.enableCalendar ) {
        if( step === "day" || step === "month" )
          this.calendar.show( );
        else if( !this.options.calendar.isPinned )
          this.calendar.hide( );
      }
    },

    to12Hour: function( value ) {
      if( this.dateTime.format( "A" ) === "PM" && value > 12 )
        return value - 12;
      return value;
    },

    to24Hour: function( value ) {
      if( this.dateTime.format( "A" ) === "PM" && value < 12 )
        return value + 12;
      else if( this.dateTime.format( "A" ) === "AM" && value > 11 )
        return value - 12;
      return value;
    },

    formatToMoment: function( step, value ) {
      if( step === "month" )
        return value - 1;
      return value;
    },

    formatFromMoment: function( step, value ) {
      if( step === "month" )
        return value + 1;
      return value;
    },


    onOptionClick: function( e ) {
      var $target = $( e.target ),
          classes = $target.attr( "class" ),
      //figure out which step was clicked
          step = classes.match( this.stepRegExp );
      if( step && step.length )
        this.activateSelectorTool( step[ 0 ] );
    },

    onClickToExit: function( e ) {
      var $target = $( e.target );
      if(
          //TODO: testing for class is shit but closest doesn't work on td day select
          //for some reason
          !/fp-/.test( $target.attr( "class" ) ) &&
          !$target.closest( this.$container ).length &&
          !$target.closest( this.$element ).length ) {
        this.hide( );
      }
    },

    clearTimeErrors : function() {
      this.$hour.removeClass('is-error');
      this.$minute.removeClass('is-error');
    },

    submitTime : function(event) {
      event.stopPropagation();
      if (event.keyCode == 13) {
        event.preventDefault();
        this.onSave();
      }
    },


    onSave: function( ) {
      if (!this['setTime']()) {
        return false;
      };

      if (!this['isInRange'](this.dateTime)) {
        return false;
      };

      this.$element.trigger( "fp:save", [ this.dateTime ] );
    },

    addEvents: function( ) {
      this.$options.on( "click", $.proxy( this.onOptionClick, this ) );
      this.$saveButton.on( "click", $.proxy( this.onSave, this ) );
      this.$hour.on("focus", this.clearTimeErrors.bind(this));
      this.$minute.on("focus", this.clearTimeErrors.bind(this));
      this.$hour.on("keypress", this.submitTime.bind(this));
      this.$minute.on("keypress", this.submitTime.bind(this));
      if( this.options.exitOnBackgroundClick )
        this.$window.on( "click." + this.id, $.proxy( this.onClickToExit, this ) );
    },

    removeEvents: function( ) {

      this.$options.off( "click" );
      this.$saveButton.off( "click" );
      this.$window.off( "click." + this.id );

    },

    setTime: function() {
      var stringHours = this.$hour.val();
      var stringMinutes = this.$minute.val();
      var intHours = parseInt(stringHours);
      var intMinutes = parseInt(stringMinutes);
      var isError = false;

      var isValidNumber = function(value) {
        return value.match(/^\d+$/);
      };

      if ( !isValidNumber(stringHours) || (intHours < 0 || intHours > 23)) {
        this.$hour.addClass('is-error');
        isError = true;
      };

      if (!isValidNumber(stringMinutes) || (intMinutes < 0 || intMinutes > 59)) {
        this.$minute.addClass('is-error');
        isError = true;
      };

      if (isError) {
        return false;
      } else {
        this.dateTime.set('hours', intHours);
        this.dateTime.set('minutes', intMinutes);
        return true;
      };

    },

    setDateTime: function( dateObj, moveNext ) {
      this.dateTime = moment( dateObj );

      if( this.options.enableCalendar )
        this.calendar.setDate( this.dateTime );

      if( !this.isInRange( this.dateTime ) )
        this.showError( this.currentStep, "Date is out of range, please fix." );
      else if( this.isError )
        this.hideError( );

      if( !this.isError && moveNext )
        this.moveRight( );
    },
    renderDateTime: function( ) {
      this.$month.text( this.dateTime.format( "MM" ) );
      this.$day.text( this.dateTime.format( "DD" ) );
      this.$hour.val( this.dateTime.format( "HH" ) );
      this.$minute.val( this.dateTime.format( "mm" ) );
      this.$meridiem.text( this.dateTime.format( "A" ) );

      this.$descriptionBox.text( this.dateTime.format( "LLLL" ) );
    },
    setInitialDateTime: function( ) {
      var currentInputValue = this.$element.val();
      var m;
      if (currentInputValue) {
        m = moment(currentInputValue, 'DD.MM.YYYY HH:mm');
      } else{
        m = moment();
      };
      m.utcOffset( this.currentTimeZone );
      //Initial value are done in increments of 15 from now.
      //If the time between now and 15 minutes from now is less than 5 minutes,
      //go onto the next 15.
      if( typeof this.options.initialDateTime === "function" )
        m = this.options.initialDateTime( m.clone( ) );

      this.updateDateTime( m );
    },

    isInRange: function( date ) {
      var minDateTime = typeof this.options.minDateTime === "function" && this.options.minDateTime( ),
          maxDateTime = typeof this.options.maxDateTime === "function" && this.options.maxDateTime( ),
          left = right = false;

      if( minDateTime ) {
        minDateTime.utcOffset( this.currentTimeZone );
        left = date.diff( minDateTime, "second" ) < 0;
      }
      if( maxDateTime ) {
        maxDateTime.utcOffset( this.currentTimeZone );
        right = date.diff( maxDateTime, "second" ) > 0;
      }

      return !( right || left )
    },

    setTimeZone: function( zone ) {
      this.dateTime.utcOffset( zone );
      this.currentTimeZone = zone;

      if( this.options.enableCalendar )
      this.calendar.setTimeZone( zone );
    },

    dateChange: function( ) {
      if( this.options.enableCalendar ) {
        this.calendar.setDate( this.dateTime );
        if( this.currentStep === "day" || this.currentStep === "month" )
          this.calendar.render( );
      }
    },

    changeDateTimeUnit: function( unit, value ) {
      var tmpDateTime = this.dateTime.clone( ).add( value, unit + "s" ),
          isInRange = this.isInRange( tmpDateTime );

      // if( !this.isError && !isInRange )
      //   return;
      // else if( isInRange )
      //   this.hideError( );

      this.dateTime.add( value, unit + "s" );
      this.renderDateTime( );

      this.dateChange( );
    },
    //api
    updateDateTimeUnit: function( unit, value, moveNext ) {
      var dateObj = this.dateTime.clone( ).set( unit, value );
      this.updateDateTime( dateObj, moveNext );
    },
    getDate: function( ) {
      return this.dateTime.clone( );
    },
    isValid: function( ) {
      return !this.isError;
    },
    updateDateTime: function( dateObj, moveNext ) {
      this.setDateTime( dateObj, moveNext );
      this.renderDateTime( );
      this.dateChange( );
    },
    show: function( ) {
      this.$element.trigger('fp:show');
      if( !this.isActive ) {
        this.setInitialDateTime( );
        this.$container.insertAfter( this.$element );
        this.activateSelectorTool( this.options.startStep );
        this.addEvents( );
        this.isActive = true;
      }
    },
    hide: function( ) {
      this.clearTimeErrors();
      this.$element.trigger('fp:hide');
      if( this.isActive ) {
        this.$container.remove( );
        this.removeEvents( );
        this.isActive = false;
      }
    },
    destroy: function( ) {
      this.removeEvents( );
      this.$container.remove( );
      this.isActive = false;
      this.$element.removeData( name );
    }
  };

  function Calendar( $element, options ) {
    var setup, renderDayLabels;

    this.options = $.extend( { }, options );
    this.date = moment( );
    this.$element = $element;

    this.currentTimeZone = null;

    var template = '<div class="fp-cal-container">' +
                      '<div class="date-month fp-cal-nav">' +
                        '<span class="month-btn month-prev fp-cal-left"></span>' +
                        '<span class="month-val fp-cal-month"></span>' +
                        '<span class="month-btn month-next fp-cal-right"></span>' +
                      '</div>' +
                      '<div class="date-week fp-cal-days"></div>' +
                      '<div class="date-day fp-cal-dates"></div>' +
                    '</div>',
    dateTemplate = '<span class="fp-cal-date" data-date=""></span>',
    weekTemplate = '<div class="day-val-list fp-cal-week"></div>',
    dayLabelTemplate = '<span class="week-val fp-cal-day-label"></span>';

    this.dateTemplateWrapper = '<div class="day-val"></div>'

    this.$container = $( template );
    this.$left = this.$container.find( ".fp-cal-left" );
    this.$right = this.$container.find( ".fp-cal-right" );
    this.$month = this.$container.find( ".fp-cal-month" );
    this.$days = this.$container.find( ".fp-cal-days" );
    this.$dates = this.$container.find( ".fp-cal-dates" );
    this.$dateTemplate = $( dateTemplate );
    this.$weekTemplate = $( weekTemplate );
    this.$dayLabelTemplate = $( dayLabelTemplate );

    this.buildDayLabels( );
  }

  //date {Moment}
  Calendar.prototype.setDate = function( date ) {
    this.date = date.clone( );
  };

  Calendar.prototype.removeEvents = function( ) {
    this.$right.off( "click" );
    this.$left.off( "click" );
    this.$dates.find( ".fp-cal-date:not( .fp-disabled )" ).off( "click" );
  };

  Calendar.prototype.addEvents = function( ) {
    this.$right.on( "click", $.proxy( this.nextMonth, this ) );
    this.$left.on( "click", $.proxy( this.prevMonth, this ) );
    this.$dates.find( ".fp-cal-date:not( .fp-disabled )" ).on( "click", $.proxy( this.onSelectDate, this ) );
  };

  Calendar.prototype.toggleMonthArrows = function( ) {
    if( this.isInMinRange( this.date.clone( ).subtract( 1, 'month' ).endOf( "month" ) ) )
      this.$left.show( );
    else
      this.$left.hide( );

    if( this.isInMaxRange( this.date.clone( ).add( 1, 'month' ).date( 1 ) ) )
      this.$right.show( );
    else
      this.$right.hide( );
  };

  Calendar.prototype.nextMonth = function( ) {
    this.date.add( 1, 'month' );
    this.selectDate( this.date.get( "year" ), this.date.get( "month" ), this.date.get( "date" ) );
    this.render( );
  };

  Calendar.prototype.prevMonth = function( ) {
    this.date.subtract( 1, 'month' );
    this.selectDate( this.date.get( "year" ), this.date.get( "month" ), this.date.get( "date" ) );
    this.render( );
  };

  Calendar.prototype.selectDate = function( year, month, date, opts ) {
    if( typeof this.options.onSelectDate === "function" )
      this.options.onSelectDate( year, month, date, opts || { } );
    this.highlightDate( date );
  };

  Calendar.prototype.onSelectDate = function( e ) {
    var $target = $( e.target ),
        addMonths = parseInt( $target.attr( "data-add-month" ), 10 );

    this.date.add( addMonths, 'month' );

    this.selectDate( this.date.get( "year" ), this.date.get( "month" ), $target.attr( "data-date" ), { activeDateClicked: !addMonths } );
  };

  Calendar.prototype.highlightDate = function( date ) {
    this.$dates.find( ".is-active" ).removeClass( "is-active" );
    this.$dates.find( ".fp-cal-date-" + date ).parent().addClass( "is-active" );
  };

  Calendar.prototype.buildTemplate = function( ) {
    this.$month.text( this.date.format( "MMMM YYYY" ) )
               .attr( "data-month", this.date.get( "month" ) + 1 );
    this.toggleMonthArrows( );
    this.buildDates( );
    this.disableOutOfRangeDates( );
    this.highlightDate( this.date.get( "date" ) );
  };

  Calendar.prototype.isInMinRange = function( date ) {
    if( typeof this.options.minDateTime !== "function" )
      return true;
    var minDate = this.options.minDateTime( );
    minDate.utcOffset( this.currentTimeZone );
    return date.diff( minDate, "second" ) > 0;
  };

  Calendar.prototype.isInMaxRange = function( date ) {
    if( typeof this.options.maxDateTime !== "function" )
      return true;
    var maxDate = this.options.maxDateTime( );
    maxDate.utcOffset( this.currentTimeZone );
    return date.diff( maxDate, "second" ) < 0;
  };

  Calendar.prototype.disableOutOfRangeDates = function( ) {
    var self = this,
        dateTmp,
        $this;

    if( typeof self.options.maxDateTime !== "function" && typeof self.options.minDateTime !== "function" )
      return;

    this.$dates.find( ".fp-cal-date" ).filter( function( ) {
      dateTmp = self.date.clone( );
      $this = $( this );

      if( $this.attr( "data-add-month" ) )
        dateTmp.add( parseInt( $this.attr( "data-add-month" ), 10 ), 'month' );

      dateTmp.date( parseInt( $( this ).attr( "data-date" ), 10 ) );
      return !( self.isInMinRange( dateTmp ) && self.isInMaxRange( dateTmp ) );
    } ).addClass( "fp-disabled" );
  };

  Calendar.prototype.buildDayLabels = function( ) {
    //do this for moment's locale setting
    var labelMaker = this.date.clone( );

    for( var i = 0; i < 7; ++i )
      this.$dayLabelTemplate.clone( ).text(
          labelMaker.day( i ).format( "ddd" ) ).appendTo( this.$days );
  };

  Calendar.prototype.buildDates = function( ) {
    var days = this.date.daysInMonth( ),
        dateCalc = this.date.clone( ),
        lastDayOfPrevMonth = this.date.clone( ).subtract( 1, 'month' ).endOf( "month" ).date( ),
        $week = this.$weekTemplate.clone( ),
        firstWeekDay = dateCalc.date( 1 ).weekday( ),
        lastWeekDay = dateCalc.date( days ).weekday( ),
        $day, i;
    this.$dates.empty( );
    //calculates previous months days
    for( i = 0; i < firstWeekDay; ++i )
      this.$dateTemplate.clone( )
          .attr( "data-add-month", -1 )
          .attr( "data-date", lastDayOfPrevMonth - i )
          .addClass( "fp-cal-date-prev-" + lastDayOfPrevMonth - i ).text( lastDayOfPrevMonth - i )
          .wrap(this.dateTemplateWrapper)
          .parent()
          .addClass("fp-not-in-month is-disabled")
          .prependTo( $week );

    //fill first week starting from days prior
    for( i = 1; i <= 7 - firstWeekDay; ++i )
      this.$dateTemplate.clone( )
          .addClass( "fp-cal-date-" + i )
          .attr( "data-date", i ).text( i )
          .wrap(this.dateTemplateWrapper)
          .parent()
          .appendTo( $week );

    $week.appendTo( this.$dates );
    $week = this.$weekTemplate.clone( );
    $week.appendTo( this.$dates );

    //Uses i from previous for loop
    for(; i <= days; ++i ) {
      if( ( i + firstWeekDay - 1 ) % 7 === 0 ) {
        $week = this.$weekTemplate.clone( );
        $week.appendTo( this.$dates );
      }
      this.$dateTemplate.clone( )
          .addClass( "fp-cal-date-" + i )
          .attr( "data-date", i ).text( i )
          .wrap(this.dateTemplateWrapper)
          .parent()
          .appendTo( $week );
    }

    //calculates next months days for remaining week
    for( i = 1; i < 7 - lastWeekDay; ++i )
      this.$dateTemplate.clone( )
          .addClass( "fp-cal-date-next-" + i )
          .attr( "data-add-month", 1 )
          .attr( "data-date", i ).text( i )
          .wrap(this.dateTemplateWrapper)
          .parent()
          .addClass("fp-not-in-month is-disabled")
          .appendTo( $week );
  };

  Calendar.prototype.render = function( ) {
    this.buildTemplate( );
    this.removeEvents( );
    this.addEvents( );
  };

  Calendar.prototype.show = function( ) {
    this.render( );
    this.$container.appendTo( this.$element );
  };

  Calendar.prototype.hide = function( ) {
    // // prevent calendar remove when clock is clicked
    // this.$container.remove( );
    // this.removeEvents( );
  };

  Calendar.prototype.get = function( ) {
    return this.$container;
  };

  Calendar.prototype.setTimeZone = function( zone ) {
    this.currentTimeZone = zone;
  };

  $.fn[ pluginName ] = function( optionsOrMethod ) {
    var $this,
        _arguments = Array.prototype.slice.call( arguments ),
        optionsOrMethod = optionsOrMethod || { };
    //Initialize a new version of the plugin
    if( ( typeof optionsOrMethod ).toLowerCase( ) === "string" && ~$.inArray( optionsOrMethod, returnableMethods ) )
      return this.data( name )[ optionsOrMethod ].apply( this.data( name ), _arguments.slice( 1, _arguments.length ) );
    else {
      return this.each(function ( ) {
        $this = $( this );
        if( !$this.data( name ) && ( typeof optionsOrMethod ).toLowerCase( ) === "object" )
          $this.data( name, new FilthyPillow( $this, optionsOrMethod ) );
        else if( ( typeof optionsOrMethod ).toLowerCase( ) === "string" ) {
          if( ~$.inArray( optionsOrMethod, methods ) )
            $this.data( name )[ optionsOrMethod ].apply( $this.data( name ), _arguments.slice( 1, _arguments.length ) );
          else
            throw new Error( "Method " + optionsOrMethod + " does not exist. Did you instantiate filthypillow?" );
        }
      } );
    }
  };
} ) );
